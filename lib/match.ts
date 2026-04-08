export type TeamKey = "A" | "B";
export type EventType = "goal" | "foul" | "yellow" | "red";

export type Player = {
  name: string;
  isStarter: boolean;
  isGoalkeeper: boolean;
  goals: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
};

export type Team = {
  key: TeamKey;
  name: string;
  color: string;
  score: number;
  teamFouls: number;
  yellowCards: number;
  redCards: number;
  players: Player[];
};

export type MatchEvent = {
  minute: number;
  teamKey: TeamKey;
  playerName: string;
  type: EventType;
  createdAt: string;
};

export type MatchData = {
  slug: string;
  title: string;
  slotMinutes: number;
  elapsedMinutes: number;
  teams: Team[];
  events: MatchEvent[];
  updatedAt: string;
};

const makePlayer = (
  name: string,
  isStarter = false,
  isGoalkeeper = false,
): Player => ({
  name,
  isStarter,
  isGoalkeeper,
  goals: 0,
  fouls: 0,
  yellowCards: 0,
  redCards: 0,
});

export const defaultMatch: Omit<MatchData, "updatedAt"> = {
  slug: "smt-futsal-session",
  title: "SMT Football Tournament Night",
  slotMinutes: 90,
  elapsedMinutes: 0,
  teams: [
    {
      key: "A",
      name: "Team A",
      color: "#0d9488",
      score: 0,
      teamFouls: 0,
      yellowCards: 0,
      redCards: 0,
      players: [
        makePlayer("Saikot", true, true),
        makePlayer("OMAR", true),
        makePlayer("EMON", true),
        makePlayer("Mynul", true),
        makePlayer("Imtiaz", true),
        makePlayer("Shahidul", true),
        makePlayer("Sharif"),
        makePlayer("Arif"),
      ],
    },
    {
      key: "B",
      name: "Team B",
      color: "#f97316",
      score: 0,
      teamFouls: 0,
      yellowCards: 0,
      redCards: 0,
      players: [
        makePlayer("Rakib", true, true),
        makePlayer("Forhad", true),
        makePlayer("Nayem", true),
        makePlayer("Shahriar", true),
        makePlayer("Hasibul", true),
        makePlayer("Jamil", true),
        makePlayer("saidi"),
        makePlayer("Sofiqul"),
        makePlayer("Alok"),
      ],
    },
  ],
  events: [],
};
