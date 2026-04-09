import {
  defaultMatch,
  type EventType,
  type PaymentStatus,
  type TeamKey,
} from "@/lib/match";
import { connectToDatabase } from "@/lib/mongodb";
import { MatchModel } from "@/models/Match";
import mongoose from "mongoose";

const MATCH_SLUG = defaultMatch.slug;

export async function getOrCreateMatch() {
  await connectToDatabase();

  let match = await MatchModel.findOne({ slug: MATCH_SLUG }).lean();

  if (!match) {
    await MatchModel.create(defaultMatch);
    match = await MatchModel.findOne({ slug: MATCH_SLUG }).lean();
  } else {
    // Check for missing kickoffTime
    if (!match.kickoffTime) {
      await MatchModel.updateOne({ slug: MATCH_SLUG }, { $set: { kickoffTime: new Date("2026-04-08T18:00:00+06:00") } });
      match = await MatchModel.findOne({ slug: MATCH_SLUG }).lean();
    }
    
    // Self-healing migration for missing event IDs (Fixing production deletion issues)
    if (match.events && match.events.some((e: any) => !e._id)) {
      const matchDoc = await MatchModel.findOne({ slug: MATCH_SLUG });
      if (matchDoc) {
        matchDoc.events.forEach((event: any) => {
          if (!event._id) event._id = new mongoose.Types.ObjectId();
        });
        await matchDoc.save();
        match = await MatchModel.findOne({ slug: MATCH_SLUG }).lean();
      }
    }

    if (!match.members || !Array.isArray(match.members)) {
      await MatchModel.updateOne({ slug: MATCH_SLUG }, { $set: { members: defaultMatch.members } });
      match = await MatchModel.findOne({ slug: MATCH_SLUG }).lean();
    }

    if (!match.upcomingEvents || !Array.isArray(match.upcomingEvents)) {
      await MatchModel.updateOne({ slug: MATCH_SLUG }, { $set: { upcomingEvents: [] } });
      match = await MatchModel.findOne({ slug: MATCH_SLUG }).lean();
    }

    if (!match.playersPerSide || ![6, 7].includes(Number(match.playersPerSide))) {
      await MatchModel.updateOne({ slug: MATCH_SLUG }, { $set: { playersPerSide: 6 } });
      match = await MatchModel.findOne({ slug: MATCH_SLUG }).lean();
    }
  }

  return match;
}

export async function setLineup(
  teamKey: TeamKey,
  starters: string[],
  goalkeeper: string,
) {
  if (!starters.includes(goalkeeper)) {
    throw new Error("Goalkeeper must be part of starters.");
  }

  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  const requiredPlayers = Number(match.playersPerSide || 6);
  if (starters.length !== requiredPlayers) {
    throw new Error(`Lineup must contain exactly ${requiredPlayers} starters.`);
  }

  const team = match.teams.find((t: { key: TeamKey }) => t.key === teamKey);

  if (!team) {
    throw new Error("Team not found.");
  }

  const starterSet = new Set(starters);

  team.players.forEach((player: { name: string; isStarter: boolean; isGoalkeeper: boolean }) => {
    player.isStarter = starterSet.has(player.name);
    player.isGoalkeeper = player.name === goalkeeper;
  });

  await match.save();
  return match.toObject();
}

export async function setPlayersPerSide(playersPerSide: 6 | 7) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  if (![6, 7].includes(Number(playersPerSide))) {
    throw new Error("playersPerSide must be 6 or 7.");
  }

  match.playersPerSide = playersPerSide;
  await match.save();
  return match.toObject();
}

export async function recordEvent(
  teamKey: TeamKey,
  playerName: string,
  type: EventType,
  minute: number,
) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  const team = match.teams.find((t: { key: TeamKey }) => t.key === teamKey);

  if (!team) {
    throw new Error("Team not found.");
  }

  const player = team.players.find((p: { name: string }) => p.name === playerName);

  if (!player) {
    throw new Error("Player not found in selected team.");
  }

  applyEventImpact(team, player, type, 1);

  match.events.unshift({
    minute,
    teamKey,
    playerName,
    type,
    createdAt: new Date(),
  });

  match.events = match.events.slice(0, 60);

  await match.save();
  return match.toObject();
}

function applyEventImpact(
  team: {
    score: number;
    teamFouls: number;
    yellowCards: number;
    redCards: number;
  },
  player: {
    goals: number;
    assists: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
  },
  type: EventType,
  direction: 1 | -1,
) {
  const add = (value: number, change: number) => Math.max(0, value + change);

  if (type === "goal") {
    player.goals = add(player.goals, direction);
    team.score = add(team.score, direction);
  }

  if (type === "assist") {
    player.assists = add(player.assists, direction);
  }

  if (type === "foul") {
    player.fouls = add(player.fouls, direction);
    team.teamFouls = add(team.teamFouls, direction);
  }

  if (type === "yellow") {
    player.yellowCards = add(player.yellowCards, direction);
    team.yellowCards = add(team.yellowCards, direction);
  }

  if (type === "red") {
    player.redCards = add(player.redCards, direction);
    team.redCards = add(team.redCards, direction);
  }
}

function findEventIndexByReference(
  events: Array<{
    _id?: { toString: () => string };
    minute: number;
    teamKey: string;
    playerName: string;
    type: string;
    createdAt?: Date;
  }>,
  reference: RemoveEventReference,
) {
  const normalizedId = normalizeEventId(reference.eventId);

  if (normalizedId) {
    const byId = events.findIndex((event) => {
      if (!event._id) return false;
      return event._id.toString() === normalizedId;
    });

    if (byId !== -1) {
      return byId;
    }
  }

  const hasFallbackFields =
    reference.minute !== undefined &&
    reference.teamKey !== undefined &&
    reference.playerName !== undefined &&
    reference.type !== undefined;

  if (!hasFallbackFields) {
    return -1;
  }

  const referenceCreatedAt = toSafeIso(reference.createdAt);

  return events.findIndex((event) => {
    if (
      Number(event.minute) !== Number(reference.minute) ||
      String(event.teamKey) !== String(reference.teamKey) ||
      String(event.playerName) !== String(reference.playerName) ||
      String(event.type) !== String(reference.type)
    ) {
      return false;
    }

    const eventCreatedAt = toSafeIso(event.createdAt);
    if (referenceCreatedAt && eventCreatedAt) {
      return eventCreatedAt === referenceCreatedAt;
    }

    return true;
  });
}

export async function setElapsedMinutes(elapsedMinutes: number) {
  await connectToDatabase();

  const match = await MatchModel.findOneAndUpdate(
    { slug: MATCH_SLUG },
    {
      $set: {
        elapsedMinutes: Math.min(Math.max(elapsedMinutes, 0), defaultMatch.slotMinutes),
      },
    },
    { new: true },
  );

  if (!match) {
    throw new Error("Match data not found.");
  }

  return match.toObject();
}

export async function setScore(teamKey: TeamKey, score: number) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  const team = match.teams.find((t: { key: TeamKey }) => t.key === teamKey);

  if (!team) {
    throw new Error("Team not found.");
  }

  team.score = Math.max(score, 0);
  await match.save();
  return match.toObject();
}

export async function setMatchMetadata(input: {
  title?: string;
  slotMinutes?: number;
}) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  if (typeof input.title === "string") {
    const title = input.title.trim();
    if (!title) {
      throw new Error("Match title cannot be empty.");
    }
    match.title = title;
  }

  if (typeof input.slotMinutes === "number" && !Number.isNaN(input.slotMinutes)) {
    match.slotMinutes = Math.max(30, Math.floor(input.slotMinutes));
    match.elapsedMinutes = Math.min(match.elapsedMinutes, match.slotMinutes);
  }

  await match.save();
  return match.toObject();
}

export async function setTeamStats(
  teamKey: TeamKey,
  stats: {
    score?: number;
    teamFouls?: number;
    yellowCards?: number;
    redCards?: number;
  },
) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  const team = match.teams.find((t: { key: TeamKey }) => t.key === teamKey);

  if (!team) {
    throw new Error("Team not found.");
  }

  const clamp = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return undefined;
    return Math.max(0, Math.floor(value));
  };

  const score = clamp(stats.score);
  const teamFouls = clamp(stats.teamFouls);
  const yellowCards = clamp(stats.yellowCards);
  const redCards = clamp(stats.redCards);

  if (score !== undefined) team.score = score;
  if (teamFouls !== undefined) team.teamFouls = teamFouls;
  if (yellowCards !== undefined) team.yellowCards = yellowCards;
  if (redCards !== undefined) team.redCards = redCards;

  await match.save();
  return match.toObject();
}

export async function setKickoffTime(kickoffTime: string) {
  await connectToDatabase();
  const match = await MatchModel.findOneAndUpdate(
    { slug: MATCH_SLUG },
    { $set: { kickoffTime: new Date(kickoffTime) } },
    { new: true },
  );

  if (!match) {
    throw new Error("Match data not found.");
  }

  return match.toObject();
}

export async function setPlayerPosition(
  teamKey: TeamKey,
  playerName: string,
  x: number,
  y: number,
) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  const team = match.teams.find((t: { key: TeamKey }) => t.key === teamKey);

  if (!team) {
    throw new Error("Team not found.");
  }

  const player = team.players.find((p: { name: string }) => p.name === playerName);

  if (!player) {
    throw new Error("Player not found.");
  }

  player.position = { x, y };

  await match.save();
  return match.toObject();
}

export async function removeEvent(eventId: string) {
  return removeEventByReference({ eventId });
}

type RemoveEventReference = {
  eventId?: string;
  minute?: number;
  teamKey?: TeamKey;
  playerName?: string;
  type?: EventType;
  createdAt?: string;
};

function normalizeEventId(eventId?: string) {
  if (!eventId) return "";
  const id = String(eventId).trim();

  // Supports accidental object-like string payloads from different serializers.
  if (id.startsWith("{") && id.includes("$oid")) {
    const match = id.match(/[a-fA-F0-9]{24}/);
    return match ? match[0] : "";
  }

  return id;
}

function toSafeIso(dateValue?: string | Date) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function removeEventByReference(reference: RemoveEventReference) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  if (!match.events || match.events.length === 0) {
    throw new Error("No events found in this match.");
  }

  const normalizedId = normalizeEventId(reference.eventId);
  const eventIndex = findEventIndexByReference(match.events, reference);

  if (eventIndex === -1) {
    throw new Error(
      normalizedId
        ? `Event with ID ${normalizedId} not found.`
        : "Event not found for provided details.",
    );
  }

  const event = match.events[eventIndex];
  const team = match.teams.find((t: any) => t.key === event.teamKey);
  const player = team?.players.find((p: any) => p.name === event.playerName);

  // Rollback stats
  if (team && player) {
    applyEventImpact(team, player, event.type as EventType, -1);
  }

  match.events.splice(eventIndex, 1);
  await match.save();
  return match.toObject();
}

export async function updateEventByReference(input: {
  reference: RemoveEventReference;
  updates: {
    minute?: number;
    teamKey?: TeamKey;
    playerName?: string;
    type?: EventType;
  };
}) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  const eventIndex = findEventIndexByReference(match.events, input.reference);
  if (eventIndex === -1) {
    throw new Error("Event not found for update.");
  }

  const currentEvent = match.events[eventIndex];
  const oldTeam = match.teams.find((team: { key: TeamKey }) => team.key === currentEvent.teamKey);
  const oldPlayer = oldTeam?.players.find((player: { name: string }) => player.name === currentEvent.playerName);

  if (!oldTeam || !oldPlayer) {
    throw new Error("Original event player/team could not be resolved.");
  }

  applyEventImpact(oldTeam, oldPlayer, currentEvent.type as EventType, -1);

  const nextTeamKey = input.updates.teamKey || (currentEvent.teamKey as TeamKey);
  const nextPlayerName = input.updates.playerName || currentEvent.playerName;
  const nextType = input.updates.type || (currentEvent.type as EventType);
  const nextMinute =
    typeof input.updates.minute === "number"
      ? Math.max(0, Math.floor(input.updates.minute))
      : currentEvent.minute;

  const nextTeam = match.teams.find((team: { key: TeamKey }) => team.key === nextTeamKey);
  const nextPlayer = nextTeam?.players.find((player: { name: string }) => player.name === nextPlayerName);

  if (!nextTeam || !nextPlayer) {
    // Restore old stats if the update target is invalid.
    applyEventImpact(oldTeam, oldPlayer, currentEvent.type as EventType, 1);
    throw new Error("Updated event player/team could not be resolved.");
  }

  applyEventImpact(nextTeam, nextPlayer, nextType, 1);

  currentEvent.minute = nextMinute;
  currentEvent.teamKey = nextTeamKey;
  currentEvent.playerName = nextPlayerName;
  currentEvent.type = nextType;

  await match.save();
  return match.toObject();
}

export async function updatePlayerStat(
  teamKey: TeamKey,
  playerName: string,
  stat: "goals" | "assists",
  increment: boolean,
) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  const team = match.teams.find((t: any) => t.key === teamKey);
  const player = team?.players.find((p: any) => p.name === playerName);

  if (!team || !player) {
    throw new Error("Team or player not found.");
  }

  const change = increment ? 1 : -1;

  if (stat === "goals") {
    player.goals = Math.max(0, player.goals + change);
    team.score = Math.max(0, team.score + change);
  } else if (stat === "assists") {
    player.assists = Math.max(0, player.assists + change);
  }

  await match.save();
  return match.toObject();
}

export async function upsertMember(member: { id?: string; name: string }) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  const trimmedName = String(member.name || "").trim();
  if (!trimmedName) {
    throw new Error("Member name is required.");
  }

  const memberId = member.id || new mongoose.Types.ObjectId().toString();
  const memberIndex = match.members.findIndex((m: { id: string }) => m.id === memberId);

  if (memberIndex >= 0) {
    match.members[memberIndex].name = trimmedName;
  } else {
    match.members.push({ id: memberId, name: trimmedName });
    match.upcomingEvents.forEach((event: { participants: Array<{ memberId: string; confirmed: boolean; paymentStatus: PaymentStatus }> }) => {
      event.participants.push({
        memberId,
        confirmed: false,
        paymentStatus: "pending",
      });
    });
  }

  await match.save();
  return match.toObject();
}

export async function removeMember(memberId: string) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  match.members = match.members.filter((m: { id: string }) => m.id !== memberId);
  match.upcomingEvents.forEach((event: { participants: Array<{ memberId: string }> }) => {
    event.participants = event.participants.filter((p: { memberId: string }) => p.memberId !== memberId);
  });

  await match.save();
  return match.toObject();
}

export async function upsertUpcomingEvent(eventInput: {
  id?: string;
  title: string;
  eventDate: string;
  slotMinutes: number;
  notes?: string;
}) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  const title = String(eventInput.title || "").trim();
  if (!title) {
    throw new Error("Event title is required.");
  }

  const eventDate = new Date(eventInput.eventDate);
  if (Number.isNaN(eventDate.getTime())) {
    throw new Error("Valid event date is required.");
  }

  const eventId = eventInput.id || new mongoose.Types.ObjectId().toString();
  const index = match.upcomingEvents.findIndex((event: { id: string }) => event.id === eventId);

  if (index >= 0) {
    match.upcomingEvents[index].title = title;
    match.upcomingEvents[index].eventDate = eventDate;
    match.upcomingEvents[index].slotMinutes = Math.max(30, Number(eventInput.slotMinutes || 90));
    match.upcomingEvents[index].notes = String(eventInput.notes || "");
  } else {
    match.upcomingEvents.push({
      id: eventId,
      title,
      eventDate,
      slotMinutes: Math.max(30, Number(eventInput.slotMinutes || 90)),
      notes: String(eventInput.notes || ""),
      participants: match.members.map((member: { id: string }) => ({
        memberId: member.id,
        confirmed: false,
        paymentStatus: "pending",
      })),
    });
  }

  match.upcomingEvents.sort(
    (a: { eventDate: Date }, b: { eventDate: Date }) =>
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
  );

  await match.save();
  return match.toObject();
}

export async function removeUpcomingEvent(eventId: string) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  match.upcomingEvents = match.upcomingEvents.filter((event: { id: string }) => event.id !== eventId);

  await match.save();
  return match.toObject();
}

export async function setUpcomingMemberStatus(input: {
  eventId: string;
  memberId: string;
  confirmed?: boolean;
  paymentStatus?: PaymentStatus;
}) {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  const event = match.upcomingEvents.find((item: { id: string }) => item.id === input.eventId);
  if (!event) {
    throw new Error("Upcoming event not found.");
  }

  let participant = event.participants.find((item: { memberId: string }) => item.memberId === input.memberId);

  if (!participant) {
    participant = {
      memberId: input.memberId,
      confirmed: false,
      paymentStatus: "pending",
    };
    event.participants.push(participant);
  }

  if (typeof input.confirmed === "boolean") {
    participant.confirmed = input.confirmed;
  }

  if (input.paymentStatus) {
    participant.paymentStatus = input.paymentStatus;
  }

  await match.save();
  return match.toObject();
}
