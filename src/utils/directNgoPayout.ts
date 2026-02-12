import { Types } from "mongoose";
import PayoutRequest from "../models/PayoutRequest";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil" as any,
});

export const directNgoPayout = async (requestId: Types.ObjectId) => {

  const request = await PayoutRequest.findById(requestId)
    .populate("ngoId");

  if (!request || !request.amount) {
    throw new Error("Invalid payout request");
  }

  const ngo = request.ngoId as any;

  const balance = await stripe.balance.retrieve({
    stripeAccount: ngo.stripeAccountId,
  });

  const available =
    balance.available.find(
      b => b.currency === request.currency
    )?.amount || 0;

  const amountCents = Math.round(request.amount * 100);

  if (amountCents > available) {
    request.status = "failed";
    await request.save();
    throw new Error("Insufficient balance");
  }

  const payout = await stripe.payouts.create(
    {
      amount: amountCents,
      currency: request.currency,
    },
    {
      stripeAccount: ngo.stripeAccountId,
    }
  );

  request.status = "paid";
  request.stripePayoutId = payout.id;
  await request.save();
};
