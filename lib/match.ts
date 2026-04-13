export type TeamKey = "A" | "B";
export type EventType = "goal" | "assist" | "foul" | "yellow" | "red";
export type PaymentStatus = "paid" | "unpaid" | "pending";
export type MatchLifecycle = "scheduled" | "live" | "ended";

export type SpecialFormationRole = "GK" | "CB" | "CMF" | "CF";

export type SpecialFormationPlayer = {
  id: string;
  name: string;
  role: SpecialFormationRole;
  officeDesignation?: string;
  designation: string;
  x: number;
  y: number;
  imageUrl?: string;
};

export type SpecialEvent = {
  enabled: boolean;
  title: string;
  subtitle: string;
  eventDate: string;
  homeTeamName: string;
  awayTeamName: string;
  badgeText: string;
  venue: string;
  squad: {
    gk: string[];
    cb: string[];
    cmf: string[];
    cf: string[];
  };
  formationPlayers: SpecialFormationPlayer[];
};

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
  imageUrl?: string;
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
  paidAmount: number;
};

export type UpcomingEvent = {
  id: string;
  title: string;
  eventDate: string;
  slotMinutes: number;
  totalSlotFee: number;
  notes?: string;
  participants: UpcomingEventMemberStatus[];
};

export type MatchData = {
  slug: string;
  title: string;
  matchLifecycle: MatchLifecycle;
  specialEvent: SpecialEvent;
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

const defaultSpecialSquad = {
  gk: ["Nayeem", "Omar"],
  cb: ["Rakib", "Fahim", "Hasib", "Polas"],
  cmf: ["Shahriar", "Mynul", "Sanim"],
  cf: ["Jamil", "Imtiaz", "Israk"],
};

const roleAnchors: Record<SpecialFormationRole, Array<[number, number]>> = {
  GK: [
    [9, 50],
    [14, 50],
  ],
  CB: [
    [24, 20],
    [24, 40],
    [24, 60],
    [24, 80],
  ],
  CMF: [
    [48, 28],
    [48, 50],
    [48, 72],
  ],
  CF: [
    [72, 32],
    [72, 50],
    [72, 68],
  ],
};

export function buildSpecialFormationPlayers(squad: {
  gk: string[];
  cb: string[];
  cmf: string[];
  cf: string[];
}): SpecialFormationPlayer[] {
  const toPlayers = (role: SpecialFormationRole, names: string[]) =>
    names.map((name, index) => {
      const [x, y] = roleAnchors[role][index] || roleAnchors[role][roleAnchors[role].length - 1];
      return {
        id: `${role.toLowerCase()}-${index + 1}-${name.toLowerCase().replace(/\s+/g, "-")}`,
        name,
        role,
        officeDesignation: "",
        designation: "",
        x,
        y,
        imageUrl: "",
      };
    });

  return [
    ...toPlayers("GK", squad.gk),
    ...toPlayers("CB", squad.cb),
    ...toPlayers("CMF", squad.cmf),
    ...toPlayers("CF", squad.cf),
  ];
}

export const defaultMatch: Omit<MatchData, "updatedAt"> = {
  slug: "smt-futsal-session",
  title: "SMT Football Tournament Night",
  matchLifecycle: "scheduled",
  specialEvent: {
    enabled: true,
    title: "Special Event Match",
    subtitle: "SMT Gamma vs FSD",
    eventDate: "2026-04-15T18:00:00+06:00",
    homeTeamName: "SMT Gamma",
    awayTeamName: "FSD",
    badgeText: "Mainstream Feature Clash",
    venue: "SM Technology Ground",
    squad: defaultSpecialSquad,
    formationPlayers: buildSpecialFormationPlayers(defaultSpecialSquad),
  },
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
