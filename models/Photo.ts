import mongoose, { Schema } from "mongoose";

const PhotoSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "photos" }
);

export const PhotoModel = mongoose.models.Photo || mongoose.model("Photo", PhotoSchema);
