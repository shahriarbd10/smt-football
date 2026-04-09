export type TeamKey = "A" | "B";
export type EventType = "goal" | "assist" | "foul" | "yellow" | "red";
export type PaymentStatus = "paid" | "unpaid" | "pending";
export type MatchLifecycle = "scheduled" | "live" | "ended";

export type Player = {
  name: string;
  isStarter: boolean;
  isGoalkeeper: boolean;
  goals: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  assists: number;
  position?: { x: number; y: number };
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
  matchId?: string;
  matchTitle?: string;
  _id?: string;
};

export type Member = {
  id: string;
  name: string;
};

export type UpcomingEventMemberStatus = {
  memberId: string;
  confirmed: boolean;
  paymentStatus: PaymentStatus;
};

export type UpcomingEvent = {
  id: string;
  title: string;
  eventDate: string;
  slotMinutes: number;
  notes?: string;
  participants: UpcomingEventMemberStatus[];
};

export type MatchData = {
  slug: string;
  title: string;
  matchLifecycle: MatchLifecycle;
  playersPerSide: 6 | 7;
  slotMinutes: number;
  elapsedMinutes: number;
  teams: Team[];
  events: MatchEvent[];
  members: Member[];
  upcomingEvents: UpcomingEvent[];
  matchHistory: MatchRecord[];
  updatedAt: string;
  kickoffTime: string;
};

export type MatchRecord = {
  id: string;
  title: string;
  playersPerSide: 6 | 7;
  slotMinutes: number;
  elapsedMinutes: number;
  teams: Team[];
  events: MatchEvent[];
  kickoffTime: string;
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
  assists: 0,
});

const initialMembers: Member[] = [
  "Saikot",
  "OMAR",
  "EMON",
  "Mynul",
  "Imtiaz",
  "Shahidul",
  "Sharif",
  "Arif",
  "Rakib",
  "Forhad",
  "Nayem",
  "Shahriar",
  "Hasibul",
  "Jamil",
  "saidi",
  "Sofiqul",
  "Alok",
].map((name) => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  name,
}));

export const defaultMatch: Omit<MatchData, "updatedAt"> = {
  slug: "smt-futsal-session",
  title: "SMT Football Tournament Night",
  matchLifecycle: "scheduled",
  playersPerSide: 6,
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
  members: initialMembers,
  upcomingEvents: [],
  matchHistory: [],
  kickoffTime: "2026-04-08T18:00:00+06:00",
};
