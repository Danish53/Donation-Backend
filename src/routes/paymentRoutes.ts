import express, { Request, Response } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Campaign } from "../models/Campaign";
import { emailService } from "../utils/emailService";
import { INgoDocument, Ngo } from "../models/Ngo";
import axios from "axios";

dotenv.config();
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil" as any,
});

interface CreatePaymentIntentBody {
  amount: number;          // NGO amount
  tipAmount: number;       // Admin amount tip
  campaignId: string;
  donorName?: string;
  donorEmail?: string;
  paymentMethod: "card" | "us_bank_account";
  frequency: "once" | "monthly";
  paymentSource: "card" | "bank";
}

interface PaypalOnboardingParams {
  ngoId: string;
}

interface PaymentIntent {
  
}

interface PayPalLink {
  rel: string;
  href: string;
  method?: string;
}

interface PayPalReferralResponse {
  links: PayPalLink[];
}


// /* Create PaymentIntent (NGO + Admin tip) */
// const createPaymentIntent = async (
//   req: Request<{}, {}, CreatePaymentIntentBody>,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { amount, tipAmount, campaignId, donorName, donorEmail, paymentMethod, frequency } = req.body;

//     if (!amount || !campaignId) {
//       res.status(400).json({ error: "Missing amount or campaignId" });
//       return;
//     }

//     // Total donor charge = NGO amount + admin tip
//     const totalAmount = Number(amount) + Number(tipAmount || 0);

//     // Fetch NGO Stripe account from DB
//     const campaign = await Campaign.findById(campaignId).populate("ngoId", "stripeAccountId name email");
//     const ngo = campaign?.ngoId as any;

//     if (!ngo?.stripeAccountId) {
//       res.status(400).json({ error: "NGO Stripe account not connected" });
//       return;
//     }

//     // Stripe PaymentIntent (Direct Charge Model)
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(totalAmount * 100), // donor pays total (USD cents)
//       currency: "usd",
//       payment_method_types: [paymentMethod],
//       metadata: {
//         campaignId,
//         donorName: donorName || "",
//         donorEmail: donorEmail || "",
//         paymentMethod,
//         frequency,
//         tipAmount: tipAmount?.toString() || "0",
//       },
//       transfer_data: {
//         destination: ngo.stripeAccountId, // NGO gets its share directly
//       },
//       application_fee_amount: Math.round((tipAmount || 0) * 100), // Admin’s share
//     });

//     console.log("✅ PaymentIntent Created:", paymentIntent);

//     res.status(200).json({
//       clientSecret: paymentIntent.client_secret,
//       totalAmount,
//       currency: "USD",
//     });
//   } catch (err) {
//     console.error("❌ Error creating PaymentIntent:", err);
//     res.status(500).json({ error: "Failed to create payment intent" });
//   }
// };

// router.post("/create-payment-intent", createPaymentIntent);

// /* Confirm Payment and Save Donation */
// const confirmPayment = async (req: Request, res: Response): Promise<void> => {
//   const { paymentIntentId } = req.body;

//   if (!paymentIntentId) {
//     res.status(400).json({ error: "Missing paymentIntentId" });
//     return;
//   }

//   try {
//     const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

//     if (paymentIntent.status === "succeeded") {
//       console.log("✅ Payment amount total:", paymentIntent.amount);

//       const campaignId = paymentIntent.metadata.campaignId;
//       const tipAmount = parseFloat(paymentIntent.metadata.tipAmount || "0");
//       const totalCharged = (paymentIntent.amount ?? 0) / 100;
//       console.log(totalCharged, "totalCharged...");
//       const ngoAmount = parseFloat(totalCharged as any) - parseFloat(tipAmount as any || "0");

//       const donation = {
//         amount: totalCharged, // donor total payment
//         ngoAmount,            // NGO’s share
//         tipAmount,            // Admin’s share
//         donorName: paymentIntent.metadata.donorName || "Anonymous",
//         donorEmail: paymentIntent.metadata.donorEmail || "Anonymous",
//         paymentMethod: paymentIntent.metadata.paymentMethod || "card",
//         timestamp: new Date(),
//       };

//       console.log("💾 Saving donation:", donation);

//       // Update Campaign Donations
//       const updatedCampaign = await Campaign.findByIdAndUpdate(
//         campaignId,
//         {
//           $push: { donations: donation },
//           $inc: { totalRaised: ngoAmount },
//         },
//         { new: true }
//       ).populate("ngoId", "name email");

//       // Send emails
//       if (updatedCampaign) {
//         const ngo = updatedCampaign.ngoId as any;

//         // Donor confirmation
//         if (donation.donorEmail) {
//           await emailService.sendDonationConfirmationEmail(
//             donation.donorEmail,
//             donation.donorName,
//             updatedCampaign.title,
//             donation.ngoAmount,
//             "USD",
//             (updatedCampaign as any)._id.toString()
//           );
//         }

//         // NGO notification
//         if (ngo?.email) {
//           await emailService.sendNgoDonationNotificationEmail(
//             ngo.email,
//             ngo.name,
//             updatedCampaign.title,
//             donation.donorName,
//             donation.ngoAmount,
//             "USD",
//             donation.donorEmail
//           );
//         }
//       }

//       res.status(200).json({ success: true, donation });
//       return;
//     }

//     res.status(200).json({
//       success: false,
//       status: paymentIntent.status,
//       message: "Payment not completed yet",
//     });
//   } catch (err) {
//     console.error("❌ Error confirming payment:", err);
//     res.status(500).json({ error: "Failed to confirm payment" });
//   }
// };

// router.post("/confirm-payment", confirmPayment);

// Stripe
/* ------------------ CREATE PAYMENT INTENT / SUBSCRIPTION ------------------ */
// const createPaymentIntent = async (
//   req: Request<{}, {}, CreatePaymentIntentBody>,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { amount, tipAmount, campaignId, donorName, donorEmail, paymentMethod, frequency, paymentSource, } = req.body;

//     if (!amount || !campaignId || !paymentSource) {
//       res.status(400).json({ error: "Missing amount or campaignId" });
//       return;
//     }

//     const totalAmount = Number(amount) + Number(tipAmount || 0);
//     const isCardPayment = paymentSource === "card";

//     // Fetch NGO Stripe account
//     const campaign = await Campaign.findById(campaignId).populate("ngoId", "stripeAccountId name email");

//     if (!campaign) {
//       res.status(404).json({ error: "Campaign not found" });
//       return;
//     }

//     const ngo = campaign?.ngoId as any;

//     if (isCardPayment && !ngo?.stripeAccountId) {
//       res.status(400).json({ error: "NGO Stripe account not connected" });
//       return;
//     }

//     // -------------------- ONE-TIME PAYMENT --------------------
//     if (frequency === "once") {
//       const paymentIntent = await stripe.paymentIntents.create({
//         amount: Math.round(totalAmount * 100),
//         currency: "usd",
//         payment_method: paymentMethod, // ✅ use paymentMethod id here
//         confirmation_method: "automatic",
//         confirm: false,
//         metadata: {
//           campaignId,
//           donorName: donorName || "",
//           donorEmail: donorEmail || "",
//           paymentMethod: paymentSource,
//           frequency,
//           tipAmount: tipAmount?.toString() || "0",
//         },
//         ...(isCardPayment && {
//         transfer_data: {
//           destination: ngo.stripeAccountId,
//         },
//         application_fee_amount: Math.round((tipAmount || 0) * 100),
//       }),
//       });

//       const netAmount = paymentIntent.amount / 100 - tipAmount;
//       await Campaign.findByIdAndUpdate(campaignId, {
//         $push: {
//           pendingPayments: {
//             orderId: paymentIntent.id,
//             amount,
//             tipAmount: tipAmount || 0,
//             donorName,
//             donorEmail,
//             receivedBy: isCardPayment ? "ngo" : "admin",
//             paymentMethod,
//             isRecurring: false,
//             timestamp: new Date(),
//           },
//         },
//         $inc: { totalRaised: netAmount },
//       });

//       console.log("✅ One-time PaymentIntent Created:", paymentIntent.id);

//       res.status(200).json({
//         clientSecret: paymentIntent.client_secret,
//         totalAmount,
//         currency: "USD",
//         type: "one-time",
//         receivedBy: isCardPayment ? "ngo" : "admin",
//       });
//       return;
//     }

//     // -------------------- MONTHLY SUBSCRIPTION --------------------
//     // if (frequency === "monthly") {
//     //   // 1️⃣ Create product & price
//     //   const product = await stripe.products.create({
//     //     name: `Monthly donation for ${campaign.title}`,
//     //   });

//     //   const price = await stripe.prices.create({
//     //     unit_amount: Math.round(totalAmount * 100),
//     //     currency: "usd",
//     //     recurring: { interval: "month" },
//     //     product: product.id,
//     //   });

//     //   // 2️⃣ Create customer
//     //   const customer = await stripe.customers.create({
//     //     name: donorName,
//     //     email: donorEmail,
//     //     metadata: { campaignId, tipAmount: tipAmount?.toString() || "0", frequency },
//     //   });

//     //   // 3️⃣ Attach payment method
//     //   await stripe.paymentMethods.attach(paymentMethod, { customer: customer.id });
//     //   await stripe.customers.update(customer.id, {
//     //     invoice_settings: { default_payment_method: paymentMethod },
//     //   });

//     //   const applicationFeePercent = Number(((tipAmount / amount) * 100).toFixed(2));

//     //   // 4️⃣ Create subscription (with expansion)
//     //   const subscription = await stripe.subscriptions.create({
//     //     customer: customer.id,
//     //     items: [{ price: price.id }],
//     //     default_payment_method: paymentMethod,
//     //     expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
//     //     collection_method: "charge_automatically",
//     //     transfer_data: { destination: ngo.stripeAccountId },
//     //     application_fee_percent: applicationFeePercent,
//     //   });

//     //   // 5️⃣ Handle payment intent or setup intent
//     //   let paymentIntent = (subscription.latest_invoice as any)?.payment_intent;
//     //   let setupIntent = (subscription as any)?.pending_setup_intent;

//     //   if (!paymentIntent && subscription.latest_invoice) {
//     //     // retrieve invoice fully expanded (sometimes not included)
//     //     const refreshed = await stripe.invoices.retrieve(
//     //       (subscription.latest_invoice as any).id,
//     //       { expand: ["payment_intent"] }
//     //     );
//     //     paymentIntent = (refreshed as any).payment_intent;
//     //   }

//     //   console.log("invoice:", subscription?.latest_invoice, "status:", (subscription.latest_invoice as any).status);
//     //   console.log("setupIntent:", setupIntent);
//     //   console.log("paymentIntent:", paymentIntent?.id);

//     //   // 6️⃣ Store in DB even if already paid (so recurring works)
      
//     //   if (!paymentIntent || !paymentIntent.client_secret) {
//     //     // Invoice is already paid → store subscription and return gracefully
//     //     await Campaign.findByIdAndUpdate(campaignId, {
//     //       $push: {
//     //         pendingRecurringPayments: {
//     //           setupTokenId: subscription.id,
//     //           amount,
//     //           tipAmount: tipAmount || 0,
//     //           donorName,
//     //           donorEmail,
//     //           timestamp: new Date(),
//     //         },
//     //       },
//     //       $inc: { totalRaised: amount - (tipAmount || 0) },
//     //     });

//     //     res.status(200).json({
//     //       message: "Subscription created and invoice already paid.",
//     //       subscriptionId: subscription.id,
//     //       totalAmount,
//     //       currency: "USD",
//     //       type: "monthly",
//     //     });
//     //     return
//     //   }

//     //   // Otherwise send the client secret
//     //   res.status(200).json({
//     //     clientSecret: paymentIntent.client_secret,
//     //     subscriptionId: subscription.id,
//     //     totalAmount,
//     //     currency: "USD",
//     //     type: "monthly",
//     //   });
//     //   return
//     // }

//     // -------------------- MONTHLY / YEARLY SUBSCRIPTION --------------------
//     if (frequency === "monthly" || frequency === "yearly") {
//       const interval = frequency === "monthly" ? "month" : "year";
//       const frequencyLabel =
//         frequency === "monthly" ? "Monthly" : "Yearly";

//       // 1️⃣ Create product & price
//       const product = await stripe.products.create({
//         name: `${frequencyLabel} donation for ${campaign.title}`,
//       });

//       const price = await stripe.prices.create({
//         unit_amount: Math.round(totalAmount * 100),
//         currency: "usd",
//         recurring: { interval }, // "month" or "year"
//         product: product.id,
//       });

//       // 2️⃣ Create customer
//       const customer = await stripe.customers.create({
//         name: donorName,
//         email: donorEmail,
//         metadata: {
//           campaignId,
//           tipAmount: tipAmount?.toString() || "0",
//           frequency, // "monthly" | "yearly"
//         },
//       });

//       // 3️⃣ Attach payment method
//       await stripe.paymentMethods.attach(paymentMethod, {
//         customer: customer.id,
//       });
//       await stripe.customers.update(customer.id, {
//         invoice_settings: { default_payment_method: paymentMethod },
//       });

//       const applicationFeePercent = isCardPayment ? Number(
//         (((tipAmount || 0) as number) / Number(amount) * 100).toFixed(2)
//       ) : "";

//       // 4️⃣ Create subscription
//       const subscription = await stripe.subscriptions.create({
//         customer: customer.id,
//         items: [{ price: price.id }],
//         default_payment_method: paymentMethod,
//         expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
//         collection_method: "charge_automatically",
//         ...(isCardPayment && {
//         transfer_data: { destination: ngo.stripeAccountId },
//         application_fee_percent: applicationFeePercent,
//         }),
//       });

//       // 5️⃣ Check payment intent (first invoice)
//       let paymentIntent = (subscription.latest_invoice as any)?.payment_intent;
//       let setupIntent = (subscription as any)?.pending_setup_intent;

//       if (!paymentIntent && subscription.latest_invoice) {
//         const refreshed = await stripe.invoices.retrieve(
//           (subscription.latest_invoice as any).id,
//           { expand: ["payment_intent"] }
//         );
//         paymentIntent = (refreshed as any).payment_intent;
//       }

//       console.log(
//         "invoice:",
//         subscription?.latest_invoice,
//         "status:",
//         (subscription.latest_invoice as any).status
//       );
//       // console.log("setupIntent:", setupIntent);
//       // console.log("paymentIntent:", paymentIntent?.id);

//       // 6️⃣ Store in DB, even if already paid
//       if (!paymentIntent || !paymentIntent.client_secret) {
//         // First invoice already paid automatically
//         await Campaign.findByIdAndUpdate(campaignId, {
//           $push: {
//             pendingRecurringPayments: {
//               setupTokenId: subscription.id,
//               amount,
//               tipAmount: tipAmount || 0,
//               donorName,
//               donorEmail,
//               frequency, // ✅ store "monthly" / "yearly"
//               timestamp: new Date(),
//             },
//           },
//           $inc: { totalRaised: amount - (tipAmount || 0) },
//         });

//         res.status(200).json({
//           message: "Subscription created and invoice already paid.",
//           subscriptionId: subscription.id,
//           totalAmount,
//           currency: "USD",
//           type: frequency, // "monthly" or "yearly"
//           receivedBy: isCardPayment ? "ngo" : "admin",
//         });
//         return;
//       }

//       // Otherwise send client secret for 3DS / confirmation on client
//       res.status(200).json({
//         clientSecret: paymentIntent.client_secret,
//         subscriptionId: subscription.id,
//         totalAmount,
//         currency: "USD",
//         type: frequency, // "monthly" or "yearly"
//       });
//       return;
//     }

//     // -------------------- INVALID FREQUENCY --------------------
//     res.status(400).json({ error: "Invalid frequency" });
//   } catch (err) {
//     console.error("❌ Error creating PaymentIntent/Subscription:", err);
//     res.status(500).json({ error: "Failed to create payment" });
//   }
// };

const createPaymentIntent = async (
  req: Request<{}, {}, CreatePaymentIntentBody>,
  res: Response
): Promise<void> => {
  try {
    const {
      amount,
      tipAmount,
      campaignId,
      donorName,
      donorEmail,
      paymentMethod,
      frequency,
      paymentSource, // "card" | "bank"
    } = req.body;

    if (!amount || !campaignId || !paymentSource) {
      res.status(400).json({ error: "Missing amount, campaignId or paymentSource" });
      return;
    }

    const baseAmount = Number(amount) || 0; 
    const tip = Number(tipAmount || 0);
    const totalAmount = baseAmount + tip;
    const totalCents = Math.round(totalAmount * 100);
    const tipCents = Math.round(tip * 100);

    const isCardPayment = paymentSource === "card";

    // Fetch NGO/connected account
    const campaign = await Campaign.findById(campaignId).populate(
      "ngoId",
      "stripeAccountId name email"
    );
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    const ngo = campaign?.ngoId as any;

    // Card requires connected account
    if (isCardPayment && !ngo?.stripeAccountId) {
      res.status(400).json({ error: "NGO Stripe account not connected" });
      return;
    }

    // Funds routing
    const fundsDestination = isCardPayment ? "connected_account" : "platform"; // for metadata

    // -------------------- ONE-TIME --------------------
    if (frequency === "once") {
      const piParams: Stripe.PaymentIntentCreateParams = {
        amount: totalCents,
        currency: "usd",
        payment_method: paymentMethod,
        confirmation_method: "automatic",
        confirm: false,
        receipt_email: donorEmail || undefined,
        description: `Donation to ${campaign.title}`,
        metadata: {
          campaignId: String(campaignId),
          ngoId: String(ngo?._id || ""),
          donorName: donorName || "",
          donorEmail: donorEmail || "",
          paymentMethod: paymentSource, // "card" | "bank"
          frequency,
          tipAmount: String(tip),
          fundsDestination,                                // "connected_account" | "platform"
          destinationAccount: ngo?.stripeAccountId || "",  // for card route
        },
      };

      if (isCardPayment) {
        // Destination charge: NGO receives baseAmount; platform gets tip via application fee
        piParams.transfer_data = { destination: ngo.stripeAccountId };
        piParams.application_fee_amount = tipCents;
      }
      // bank route => platform PI (no transfer_data / no application_fee)

      const paymentIntent = await stripe.paymentIntents.create(piParams);

      // Save pending (do NOT increment raised here; do it on confirm/webhook)
      await Campaign.findByIdAndUpdate(campaignId, {
        $push: {
          pendingPayments: {
            orderId: paymentIntent.id,
            amount: baseAmount,
            tipAmount: tip,
            adminAmount: isCardPayment ? tip : totalAmount,
            donorName,
            donorEmail,
            paymentMethod, // Stripe PM id
            isRecurring: false,
            receivedBy: isCardPayment ? "ngo" : "admin",
            fundsDestination,
            destinationAccount: isCardPayment ? ngo.stripeAccountId : null,
            timestamp: new Date(),
          },
        },
      });

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        totalAmount,
        currency: "USD",
        type: "one-time",
        receivedBy: isCardPayment ? "ngo" : "admin",
      });
      return;
    }

    // -------------------- MONTHLY / YEARLY --------------------
    if (frequency === "monthly" || frequency === "yearly") {
      const interval = frequency === "monthly" ? "month" : "year";
      const frequencyLabel = frequency === "monthly" ? "Monthly" : "Yearly";

      const product = await stripe.products.create({
        name: `${frequencyLabel} donation for ${campaign.title}`,
      });

      const price = await stripe.prices.create({
        unit_amount: totalCents,
        currency: "usd",
        recurring: { interval },
        product: product.id,
      });

      const customer = await stripe.customers.create({
        name: donorName || undefined,
        email: donorEmail || undefined,
        metadata: {
          campaignId: String(campaignId),
          ngoId: String(ngo?._id || ""),
          frequency,
          tipAmount: String(tip),
          fundsDestination,
        },
      });

      await stripe.paymentMethods.attach(paymentMethod, { customer: customer.id });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethod },
      });

      const subParams: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: price.id }],
        default_payment_method: paymentMethod,
        expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
        collection_method: "charge_automatically",
        metadata: {
          campaignId: String(campaignId),
          ngoId: String(ngo?._id || ""),
          frequency,
          tipAmount: String(tip),
          fundsDestination,
          destinationAccount: ngo?.stripeAccountId || "",
        },
      };

      if (isCardPayment) {
        // Only for connected-account route
        const applicationFeePercent = Number((((tip || 0) / (baseAmount || 1)) * 100).toFixed(2));
        (subParams as any).transfer_data = { destination: ngo.stripeAccountId };
        (subParams as any).application_fee_percent = applicationFeePercent;
      }

      const subscription = await stripe.subscriptions.create(subParams);

      let paymentIntent = (subscription.latest_invoice as any)?.payment_intent;
      if (!paymentIntent && subscription.latest_invoice) {
        const refreshed = await stripe.invoices.retrieve(
          (subscription.latest_invoice as any).id,
          { expand: ["payment_intent"] }
        );
        paymentIntent = (refreshed as any).payment_intent;
      }

      // Store pending recurring (no raised yet; do it on success)
      await Campaign.findByIdAndUpdate(campaignId, {
        $push: {
          pendingRecurringPayments: {
            setupTokenId: subscription.id,
            amount: baseAmount,
            tipAmount: tip,
            adminAmount: isCardPayment ? tip : totalAmount,
            donorName,
            donorEmail,
            frequency,
            receivedBy: isCardPayment ? "ngo" : "admin",
            fundsDestination,
            destinationAccount: isCardPayment ? ngo.stripeAccountId : null,
            timestamp: new Date(),
          },
        },
      });

      if (!paymentIntent || !paymentIntent.client_secret) {
        res.status(200).json({
          message: "Subscription created.",
          subscriptionId: subscription.id,
          totalAmount,
          currency: "USD",
          type: frequency,
          receivedBy: isCardPayment ? "ngo" : "admin",
        });
        return;
      }

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscription.id,
        totalAmount,
        currency: "USD",
        type: frequency,
        receivedBy: isCardPayment ? "ngo" : "admin",
      });
      return;
    }

    res.status(400).json({ error: "Invalid frequency" });
  } catch (err) {
    console.error("❌ Error creating PaymentIntent/Subscription:", err);
    res.status(500).json({ error: "Failed to create payment" });
  }
};

router.post("/create-payment-intent", createPaymentIntent);

/* ------------------ CONFIRM PAYMENT ------------------ */
// const confirmPayment = async (req: Request, res: Response): Promise<void> => {
//   const { paymentIntentId, type } = req.body;

//   if (!paymentIntentId) {
//     res.status(400).json({ error: "Missing paymentIntentId" });
//     return;
//   }

//   try {
//     let payment: any;

//     if (type === "one-time") {
//       payment = await stripe.paymentIntents.retrieve(paymentIntentId);
//     } else if (type === "monthly") {
//       // paymentIntentId actually comes from subscription.latest_invoice.payment_intent
//       const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
//       payment = pi;
//     } else {
//       res.status(400).json({ error: "Invalid type" });
//       return;
//     }

//     if (payment.status === "succeeded") {
//       const campaignId = payment.metadata.campaignId;
//       const tipAmount = parseFloat(payment.metadata.tipAmount || "0");
//       const totalCharged = (payment.amount ?? 0) / 100;
//       const ngoAmount = totalCharged - tipAmount;

//       const donation = {
//         amount: totalCharged,
//         ngoAmount,
//         tipAmount,
//         donorName: payment.metadata.donorName || "Anonymous",
//         donorEmail: payment.metadata.donorEmail || "Anonymous",
//         paymentMethod: payment.metadata.paymentMethod || "card",
//         frequency: payment.metadata.frequency || "once",
//         timestamp: new Date(),
//       };

//       if (type === "one-time") {
//         await Campaign.findByIdAndUpdate(campaignId, {
//           $pull: { pendingPayments: { orderId: paymentIntentId } },
//           $push: { donations: donation },
//           $inc: { totalRaised: ngoAmount },
//         });
//       } else if (type === "monthly") {
//         await Campaign.findByIdAndUpdate(campaignId, {
//           $push: { recurringPayments: donation },
//           $inc: { totalRaised: ngoAmount },
//         });
//       }

//       res.status(200).json({ success: true, donation });
//       return;
//     }

//     res.status(200).json({
//       success: false,
//       status: payment.status,
//       message: "Payment not completed yet",
//     });
//   } catch (err) {
//     console.error("❌ Error confirming payment:", err);
//     res.status(500).json({ error: "Failed to confirm payment" });
//   }
// };

// const confirmPayment = async (req: Request, res: Response): Promise<void> => {
//   const { paymentIntentId, type } = req.body;

//   if (!paymentIntentId) {
//     res.status(400).json({ error: "Missing paymentIntentId" });
//     return;
//   }

//   try {
//     let payment: any;

//     if (type === "one-time" || type === "once") {
//       payment = await stripe.paymentIntents.retrieve(paymentIntentId);
//     } else if (type === "monthly") {
//       // paymentIntentId actually comes from subscription.latest_invoice.payment_intent
//       const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
//       payment = pi;
//     } else {
//       res.status(400).json({ error: "Invalid type" });
//       return;
//     }

//     if (payment.status === "succeeded") {
//       const campaignId = payment.metadata.campaignId;
//       const tipAmount = parseFloat(payment.metadata.tipAmount || "0");
//       // Prefer amount_received for succeeded intents; fallback to amount
//       const totalCharged = ((payment.amount_received ?? payment.amount) ?? 0) / 100;
//       const donationNet = Number((totalCharged - tipAmount).toFixed(2)); // raised without tip
//       console.log(donationNet, "donation net ngo")

//       // const fundsDestination = payment.metadata.fundsDestination || "connected_account"; // or "platform"
//       // const receivedBy = fundsDestination === "platform" ? "admin" : "ngo";
//       const paymentSource = payment.metadata.paymentMethod || "card"; // card | bank
//       const isCardPayment = paymentSource === "card";
//       const ngoAmount = isCardPayment ? donationNet : 0;
//       const adminAmount = isCardPayment ? tipAmount : totalCharged;
//       const donation = {
//         amount: totalCharged,
//         ngoAmount,
//         tipAmount,
//         adminAmount,
//         donorName: payment.metadata.donorName || "Anonymous",
//         donorEmail: payment.metadata.donorEmail || "Anonymous",
//         paymentMethod: paymentSource, // "card" | "bank"
//         frequency: payment.metadata.frequency || "once",
//         receivedBy: isCardPayment ? "ngo" : "admin",
//         timestamp: new Date(),
//       };

//       if (type === "one-time") {
//         await Campaign.findByIdAndUpdate(campaignId, {
//           $pull: { pendingPayments: { orderId: paymentIntentId } },
//           $push: { donations: donation },
//           $inc: { totalRaised: donationNet },
//         });
//       } else {
//         await Campaign.findByIdAndUpdate(campaignId, {
//           $push: { recurringPayments: donation },
//           $inc: { totalRaised: donationNet },
//         });
//       }

//       res.status(200).json({ success: true, donation });
//       return;
//     }

//     res.status(200).json({
//       success: false,
//       status: payment.status,
//       message: "Payment not completed yet",
//     });
//   } catch (err) {
//     console.error("❌ Error confirming payment:", err);
//     res.status(500).json({ error: "Failed to confirm payment" });
//   }
// };

// router.post("/confirm-payment", confirmPayment);

// PAYPAL

const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature failed", err.message);
    res.status(400).send(`Webhook Error`);
    return;
  }

  try {
    // =========================
    // 💳 ONE-TIME PAYMENT
    // =========================
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;

      const campaignId = pi.metadata.campaignId;
      const tipAmount = Number(pi.metadata.tipAmount || 0);
      const total = (pi.amount_received ?? pi.amount) / 100;
      const donationNet = total - tipAmount;

      await Campaign.findByIdAndUpdate(campaignId, {
        $pull: { pendingPayments: { orderId: pi.id } },
        $push: {
          donations: {
            amount: total,
            ngoAmount: donationNet,
            tipAmount,
            donorName: pi.metadata.donorName || "Anonymous",
            donorEmail: pi.metadata.donorEmail || "Anonymous",
            paymentMethod: pi.metadata.paymentMethod || "card",
            frequency: "once",
            receivedBy:
              pi.metadata.fundsDestination === "connected_account"
                ? "ngo"
                : "admin",
            timestamp: new Date(),
          },
        },
        $inc: { totalRaised: donationNet },
      });
    }

    // =========================
    // 🔁 MONTHLY / YEARLY
    // =========================

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      //@ts-ignore
      const pi = invoice.payment_intent as Stripe.PaymentIntent;

      if (!pi){
        res.json({ received: true });
        return
      } 

      const campaignId = pi.metadata.campaignId;
      const tipAmount = Number(pi.metadata.tipAmount || 0);
      const total = invoice.amount_paid / 100;
      const donationNet = total - tipAmount;

      await Campaign.findByIdAndUpdate(campaignId, {
        $push: {
          recurringPayments: {
            amount: total,
            ngoAmount: donationNet,
            tipAmount,
            frequency: pi.metadata.frequency,
            timestamp: new Date(),
          },
        },
        $inc: { totalRaised: donationNet },
      });
    }

    res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handling error", err);
    res.status(500).send("Webhook error");
  }
};

router.post("/stripe-webhook", stripeWebhook);

const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  const { paymentIntentId, donorEmail, donorName } = req.body;

  if (!paymentIntentId) {
    res.status(400).json({ error: "Missing paymentIntentId" });
    return;
  }

  try {
    const payment = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (payment.status === "succeeded") {
      // Campaign fetch karo
      const campaign = await Campaign.findById(payment.metadata.campaignId);
      // console.log("Campaign for thank you email:", campaign);
      if (campaign?.thankYouEmail) {
  // console.log("Preparing to send donor email...");
  // console.log("Donor Email:", donorEmail);
  // console.log("Donor Name:", donorName);
  // console.log("Email Subject:", campaign.thankYouEmail.subject);
  // console.log("Email Body:", campaign.thankYouEmail.body);

  try {
    await emailService.sendEmailToDonor(
      donorEmail,
      donorName,
      campaign?.thankYouEmail?.subject || "Thank You for Your Donation",
      campaign?.thankYouEmail?.body || ""
    );
    // console.log("✅ Donor email sent successfully");
  } catch (err) {
    console.error("❌ Failed to send donor email:", err);
  }
} else {
  console.log("Campaign thankYouEmail not found, skipping email.");
}

    }

    res.status(200).json({
      success: payment.status === "succeeded",
      status: payment.status,
      amount: payment.amount / 100,
      currency: payment.currency,
      frequency: payment.metadata.frequency || "once",
      message:
        payment.status === "succeeded"
          ? "Payment confirmed"
          : "Payment not completed yet",
    });
  } catch (err) {
    console.error("❌ confirmPayment error:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
};

router.post("/confirm-payment", confirmPayment);


const getPaypalAccessToken = async (): Promise<string> => {
  const base = process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const response = await axios.post(
    `${base}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
};

// paypal payment create
const createPaypalPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, tipAmount, campaignId, donorName, donorEmail, frequency } = req.body;

    if (!amount || !campaignId) {
      res.status(400).json({ error: "Missing amount or campaignId" });
      return
    }

    const totalAmount = Number(amount) + Number(tipAmount || 0);
    const campaign = await Campaign.findById(campaignId).populate("ngoId", "paypalMerchantId name email");
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return
    }

    const ngo = campaign.ngoId as any;
    if (!ngo?.paypalMerchantId) {
      res.status(400).json({ error: "NGO PayPal account not connected" });
      return
    }

    const accessToken = await getPaypalAccessToken();
    const base = process.env.PAYPAL_MODE === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    /* -------------------- ONE-TIME PAYMENT -------------------- */
    if (frequency === "once") {
      const order = await axios.post(
        `${base}/v2/checkout/orders`,
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: totalAmount.toFixed(2),
                breakdown: {
                  item_total: { currency_code: "USD", value: amount.toFixed(2) },
                  handling: { currency_code: "USD", value: tipAmount.toFixed(2) },
                },
              },
              payee: { merchant_id: ngo.paypalMerchantId },
              payment_instruction: {
                disbursement_mode: "INSTANT",
                platform_fees: [
                  {
                    amount: { currency_code: "USD", value: tipAmount.toFixed(2) },
                    payee: { merchant_id: process.env.ADMIN_PAYPAL_MERCHANT_ID },
                  },
                ],
              },
            },
          ],
          application_context: {
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
          },
        },
        { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
      );

      res.status(200).json({
        type: "Once",
        orderId: order.data.id,
        approvalUrl: order.data.links.find((l: any) => l.rel === "approve")?.href,
      });
      return
    }

    /* -------------------- MONTHLY SUBSCRIPTION -------------------- */
    if (frequency === "monthly") {
      // 1️⃣ Create dynamic plan (per NGO)
      const plan = await axios.post(
        `${base}/v1/billing/plans`,
        {
          product_id: process.env.PAYPAL_PRODUCT_ID,
          name: `Monthly Donation for ${ngo.name}`,
          description: `Recurring donation for ${campaign.title}`,
          billing_cycles: [
            {
              frequency: { interval_unit: "MONTH", interval_count: 1 },
              tenure_type: "REGULAR",
              sequence: 1,
              total_cycles: 0,
              pricing_scheme: {
                fixed_price: { value: totalAmount.toFixed(2), currency_code: "USD" },
              },
            },
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee_failure_action: "CONTINUE",
            payment_failure_threshold: 1,
          },
        },
        { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
      );

      // 2️⃣ Create subscription (without redirect)
      const subscription = await axios.post(
        `${base}/v1/billing/subscriptions`,
        {
          plan_id: plan.data.id,
          subscriber: { name: { given_name: donorName }, email_address: donorEmail },
          application_context: {
            user_action: "SUBSCRIBE_NOW",
            shipping_preference: "NO_SHIPPING",
          },
        },
        { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
      );

      res.status(200).json({
        type: "monthly",
        subscriptionId: subscription.data.id,
        approvalUrl: subscription.data.links.find((l: any) => l.rel === "approve")?.href,
      });
      return
    }

    res.status(400).json({ error: "Invalid frequency" });
    return
  } catch (err: any) {
    console.error("❌ PayPal payment creation failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create PayPal payment", details: err.message });
  }
};

router.post("/create-paypal-payment", createPaypalPayment);

// confirm paypal payment
const confirmPaypalPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, orderId, subscriptionId } = req.body;
    const accessToken = await getPaypalAccessToken();
    const base = process.env.PAYPAL_MODE === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    if (type === "Once") {
      const capture = await axios.post(
        `${base}/v2/checkout/orders/${orderId}/capture`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (capture.data.status === "COMPLETED") {
        // update DB, add donation, etc.
        res.status(200).json({ success: true, capture: capture.data });
        return
      }
      res.status(400).json({ success: false, message: "Payment not completed" });
      return
    }

    if (type === "monthly") {
      const subscription = await axios.get(`${base}/v1/billing/subscriptions/${subscriptionId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (subscription.data.status === "ACTIVE") {
        // store subscription in DB
        res.status(200).json({ success: true, subscription: subscription.data });
        return
      }
      res.status(400).json({ success: false, message: "Subscription not active yet" });
      return
    }

    res.status(400).json({ error: "Invalid type" });
  } catch (err: any) {
    console.error("❌ Error confirming PayPal payment:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to confirm PayPal payment" });
  }
};

router.post("/confirm-paypal-payment", confirmPaypalPayment);



export default router;







