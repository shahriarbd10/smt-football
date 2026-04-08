import { connectToDatabase } from "./lib/mongodb";
import { MatchModel } from "./models/Match";
import mongoose from "mongoose";

async function migrate() {
  await connectToDatabase();
  const match = await MatchModel.findOne({ slug: "smt-futsal-session" });
  if (match && match.events) {
    console.log(`Checking ${match.events.length} events...`);
    match.events.forEach((event: any) => {
      if (!event._id) {
        event._id = new mongoose.Types.ObjectId();
        console.log(`Added ID to event at minute ${event.minute}`);
      }
    });
    await match.save();
    console.log("Migration complete.");
  }
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
