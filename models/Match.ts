import mongoose, { Schema } from "mongoose";

const PlayerSchema = new Schema(
  {
    name: { type: String, required: true },
    isStarter: { type: Boolean, default: false },
    isGoalkeeper: { type: Boolean, default: false },
    goals: { type: Number, default: 0 },
    fouls: { type: Number, default: 0 },
    yellowCards: { type: Number, default: 0 },
    redCards: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    position: {
      x: { type: Number },
      y: { type: Number },
    },
    imageUrl: { type: String },
  },
  { _id: false },
);

const TeamSchema = new Schema(
  {
    key: { type: String, enum: ["A", "B"], required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    score: { type: Number, default: 0 },
    teamFouls: { type: Number, default: 0 },
    yellowCards: { type: Number, default: 0 },
    redCards: { type: Number, default: 0 },
    players: { type: [PlayerSchema], default: [] },
  },
  { _id: false },
);

const MatchEventSchema = new Schema(
  {
    minute: { type: Number, required: true },
    matchId: { type: String, default: "live" },
    matchTitle: { type: String, default: "Live Match" },
    teamKey: { type: String, enum: ["A", "B"], required: true },
    playerName: { type: String, required: true },
    type: {
      type: String,
      enum: ["goal", "assist", "foul", "yellow", "red"],
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const MemberSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
);

const UpcomingEventMemberStatusSchema = new Schema(
  {
    memberId: { type: String, required: true },
    confirmed: { type: Boolean, default: false },
    paidAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid", "pending"],
      default: "pending",
    },
  },
  { _id: false },
);

const UpcomingEventSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    eventDate: { type: Date, required: true },
    slotMinutes: { type: Number, default: 90 },
    totalSlotFee: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    participants: { type: [UpcomingEventMemberStatusSchema], default: [] },
  },
  { _id: false },
);

const MatchRecordSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    playersPerSide: { type: Number, enum: [6, 7], default: 6 },
    slotMinutes: { type: Number, default: 90 },
    elapsedMinutes: { type: Number, default: 0 },
    teams: { type: [TeamSchema], default: [] },
    events: { type: [MatchEventSchema], default: [] },
    kickoffTime: { type: Date, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const SpecialEventSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: "Special Event Match" },
    subtitle: { type: String, default: "SMT Gamma vs FSD" },
    eventDate: { type: Date, default: () => new Date("2026-04-15T18:00:00+06:00") },
    homeTeamName: { type: String, default: "SMT Gamma" },
    awayTeamName: { type: String, default: "FSD" },
    badgeText: { type: String, default: "Mainstream Feature Clash" },
    venue: { type: String, default: "SM Technology Ground" },
    squad: {
      gk: { type: [String], default: ["Nayeem", "Omar"] },
      cb: { type: [String], default: ["Rakib", "Fahim", "Hasib", "Polas"] },
      cmf: { type: [String], default: ["Shahriar", "Mynul", "Sanim"] },
      cf: { type: [String], default: ["Jamil", "Imtiaz", "Israk"] },
    },
    formationPlayers: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          role: { type: String, enum: ["GK", "CB", "CMF", "CF"], required: true },
          officeDesignation: { type: String, default: "" },
          designation: { type: String, default: "" },
          x: { type: Number, required: true },
          y: { type: Number, required: true },
          imageUrl: { type: String, default: "" },
        },
      ],
      default: [
        { id: "gk-1-nayeem", name: "Nayeem", role: "GK", officeDesignation: "Goalkeeper", designation: "Goalkeeper", x: 9, y: 50, imageUrl: "" },
        { id: "gk-2-omar", name: "Omar", role: "GK", officeDesignation: "Goalkeeper", designation: "Goalkeeper", x: 14, y: 50, imageUrl: "" },
        { id: "cb-1-rakib", name: "Rakib", role: "CB", officeDesignation: "Center Back", designation: "Center Back", x: 24, y: 20, imageUrl: "" },
        { id: "cb-2-fahim", name: "Fahim", role: "CB", officeDesignation: "Center Back", designation: "Center Back", x: 24, y: 40, imageUrl: "" },
        { id: "cb-3-hasib", name: "Hasib", role: "CB", officeDesignation: "Center Back", designation: "Center Back", x: 24, y: 60, imageUrl: "" },
        { id: "cb-4-polas", name: "Polas", role: "CB", officeDesignation: "Center Back", designation: "Center Back", x: 24, y: 80, imageUrl: "" },
        { id: "cmf-1-shahriar", name: "Shahriar", role: "CMF", officeDesignation: "Central Midfielder", designation: "Central Midfielder", x: 48, y: 28, imageUrl: "" },
        { id: "cmf-2-mynul", name: "Mynul", role: "CMF", officeDesignation: "Central Midfielder", designation: "Central Midfielder", x: 48, y: 50, imageUrl: "" },
        { id: "cmf-3-sanim", name: "Sanim", role: "CMF", officeDesignation: "Central Midfielder", designation: "Central Midfielder", x: 48, y: 72, imageUrl: "" },
        { id: "cf-1-jamil", name: "Jamil", role: "CF", officeDesignation: "Center Forward", designation: "Center Forward", x: 72, y: 32, imageUrl: "" },
        { id: "cf-2-imtiaz", name: "Imtiaz", role: "CF", officeDesignation: "Center Forward", designation: "Center Forward", x: 72, y: 50, imageUrl: "" },
        { id: "cf-3-israk", name: "Israk", role: "CF", officeDesignation: "Center Forward", designation: "Center Forward", x: 72, y: 68, imageUrl: "" },
      ],
    },
  },
  { _id: false },
);

const MatchSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    matchLifecycle: { type: String, enum: ["scheduled", "live", "ended"], default: "scheduled" },
    specialEvent: { type: SpecialEventSchema, default: () => ({}) },
    playersPerSide: { type: Number, enum: [6, 7], default: 6 },
    slotMinutes: { type: Number, required: true, default: 90 },
    elapsedMinutes: { type: Number, required: true, default: 0 },
    teams: { type: [TeamSchema], default: [] },
    events: { type: [MatchEventSchema], default: [] },
    members: { type: [MemberSchema], default: [] },
    upcomingEvents: { type: [UpcomingEventSchema], default: [] },
    matchHistory: { type: [MatchRecordSchema], default: [] },
    kickoffTime: { type: Date, default: () => new Date("2026-04-08T18:00:00+06:00") },
  },
  { timestamps: true },
);

export const MatchModel =
  mongoose.models.Match || mongoose.model("Match", MatchSchema);
