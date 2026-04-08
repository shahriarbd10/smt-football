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
