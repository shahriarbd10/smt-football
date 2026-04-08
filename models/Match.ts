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
    teamKey: { type: String, enum: ["A", "B"], required: true },
    playerName: { type: String, required: true },
    type: {
      type: String,
      enum: ["goal", "foul", "yellow", "red"],
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const MatchSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    slotMinutes: { type: Number, required: true, default: 90 },
    elapsedMinutes: { type: Number, required: true, default: 0 },
    teams: { type: [TeamSchema], default: [] },
    events: { type: [MatchEventSchema], default: [] },
  },
  { timestamps: true },
);

export const MatchModel =
  mongoose.models.Match || mongoose.model("Match", MatchSchema);
