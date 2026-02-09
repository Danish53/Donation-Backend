// models/PayoutRequest.ts

import mongoose from "mongoose";

const payoutRequestSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ngo",
      required: true,
    },
    amount: Number,
    currency: String,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },

    stripePayoutId: String,

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    note: String,
  },
  { timestamps: true }
);

export default mongoose.model("PayoutRequest", payoutRequestSchema);