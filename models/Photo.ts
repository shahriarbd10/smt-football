import mongoose, { Schema } from "mongoose";

const PhotoSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    matchId: { type: String, default: "live", index: true },
    matchTitle: { type: String, default: "Live Match" },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    uploaderName: { type: String, default: "Anonymous" },
    uploaderRole: { type: String, enum: ["public", "admin"], default: "public" },
    uploaderIp: { type: String, default: "" },
    uploaderUserAgent: { type: String, default: "" },
    approvedAt: { type: Date },
    approvedBy: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "photos" }
);

export const PhotoModel = mongoose.models.Photo || mongoose.model("Photo", PhotoSchema);
