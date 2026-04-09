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

const MatchSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    matchLifecycle: { type: String, enum: ["scheduled", "live", "ended"], default: "scheduled" },
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
