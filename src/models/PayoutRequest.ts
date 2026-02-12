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
    currency: {
      type: String,
      default: "usd",
    },

    // ✅ NEW
    payoutMode: {
      type: String,
      enum: ["direct", "admin"], // NGO direct OR admin approval
      default: "admin",
    },

    status: {
      type: String,
      enum: [
        "pending",     // waiting admin
        "processing",  // direct payout running
        "approved",    // admin approved
        "rejected",
        "paid",
        "failed",
      ],
      default: "pending",
    },

    adminApprovedAt: Date,

    stripePayoutId: String,

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    note: String,

    // ✅ NEW
    adminNote: String,

  },
  { timestamps: true }
);

export default mongoose.model("PayoutRequest", payoutRequestSchema);
