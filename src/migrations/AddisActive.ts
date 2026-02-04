import mongoose from "mongoose";
import dotenv from "dotenv";
import { Ngo } from "../models/Ngo";
import { Campaign } from "../models/Campaign";

dotenv.config({ path: ".env" });

console.log("MONGO_URI =", process.env.MONGODB_URI);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);

  const result = await Ngo.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );
  const ResultNGOAccountReady = await Ngo.updateMany(
    { NGOAccountReady: { $exists: false } },
    { $set: { NGOAccountReady: false } }
  );
  const ResultcampaignStripeStatus = await Campaign.updateMany(
    { stripeComplete: { $exists: false } },
    { $set: { stripeComplete: false } }
  );

//   console.log("Done:", result);
//   console.log("Done:", ResultNGOAccountReady);
  console.log("Done:", ResultcampaignStripeStatus);
  process.exit(0);
})();

// this commmand run terminal  npx ts-node src/migrations/AddIsActive.ts