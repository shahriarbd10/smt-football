import { defaultMatch, type EventType, type TeamKey } from "@/lib/match";
import { connectToDatabase } from "@/lib/mongodb";
import { MatchModel } from "@/models/Match";

const MATCH_SLUG = defaultMatch.slug;

export async function getOrCreateMatch() {
  await connectToDatabase();

  let match = await MatchModel.findOne({ slug: MATCH_SLUG }).lean();

  if (!match) {
    await MatchModel.create(defaultMatch);
    match = await MatchModel.findOne({ slug: MATCH_SLUG }).lean();
  } else if (!match.kickoffTime) {
    await MatchModel.updateOne({ slug: MATCH_SLUG }, { $set: { kickoffTime: new Date("2026-04-08T18:00:00+06:00") } });
    match = await MatchModel.findOne({ slug: MATCH_SLUG }).lean();
  }

  return match;
}

export async function setLineup(
  teamKey: TeamKey,
  starters: string[],
  goalkeeper: string,
) {
  if (starters.length !== 6) {
    throw new Error("Lineup must contain exactly 6 starters.");
  }

  if (!starters.includes(goalkeeper)) {
    throw new Error("Goalkeeper must be part of starters.");
  }

  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
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

  if (type === "goal") {
    player.goals += 1;
    team.score += 1;
  }

  if (type === "assist") {
    player.assists += 1;
  }

  if (type === "foul") {
    player.fouls += 1;
    team.teamFouls += 1;
  }

  if (type === "yellow") {
    player.yellowCards += 1;
    team.yellowCards += 1;
  }

  if (type === "red") {
    player.redCards += 1;
    team.redCards += 1;
  }

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
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: MATCH_SLUG });

  if (!match) {
    throw new Error("Match data not found.");
  }

  if (!match.events || match.events.length === 0) {
    throw new Error("No events found in this match.");
  }

  const eventIndex = match.events.findIndex((e: any) => {
    const idStr = e._id ? e._id.toString() : "";
    return idStr === eventId;
  });

  if (eventIndex === -1) {
    throw new Error(`Event with ID ${eventId} not found.`);
  }

  const event = match.events[eventIndex];
  const team = match.teams.find((t: any) => t.key === event.teamKey);
  const player = team?.players.find((p: any) => p.name === event.playerName);

  // Rollback stats
  if (team && player) {
    if (event.type === "goal") {
      player.goals = Math.max(0, player.goals - 1);
      team.score = Math.max(0, team.score - 1);
    } else if (event.type === "assist") {
      player.assists = Math.max(0, player.assists - 1);
    } else if (event.type === "foul") {
      player.fouls = Math.max(0, player.fouls - 1);
      team.teamFouls = Math.max(0, team.teamFouls - 1);
    } else if (event.type === "yellow") {
      player.yellowCards = Math.max(0, player.yellowCards - 1);
      team.yellowCards = Math.max(0, team.yellowCards - 1);
    } else if (event.type === "red") {
      player.redCards = Math.max(0, player.redCards - 1);
      team.redCards = Math.max(0, team.redCards - 1);
    }
  }

  match.events.splice(eventIndex, 1);
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
