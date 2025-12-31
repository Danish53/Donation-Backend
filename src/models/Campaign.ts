import mongoose, { Document, Schema } from "mongoose";

export interface IDonation {
  donorId?: string;
  donorName: string;
  donorEmail?: string;
  amount: number;
  tipAmount: number;
  message?: string;
  timestamp: Date;
  isRecurring?: boolean;
}

export interface IPendingPayment {
  orderId: string;
  amount: number;
  tipAmount: number;
  donorName: string;
  donorEmail?: string;
  paymentMethod: string;
  message?: string;
  timestamp: Date;
  isRecurring?: boolean;
}

export interface IRecurringPayment {
  paymentToken: string;
  amount: number;
  tipAmount: number;
  donorName: string;
  donorEmail?: string;
  paymentMethod: string;
  frequency: string;
  timestamp: Date;
}

export interface IPendingRecurringPayment {
  setupTokenId: string;
  amount: number;
  tipAmount: number;
  donorName: string;
  donorEmail?: string;
  timestamp: Date;
}

// interface FAQItem {
//   question: string;
//   answer: string;
// }

export interface ICampaign extends Document {
  title: string;
  description: string;
  ngoId: mongoose.Types.ObjectId;
  fundingGoal: number;
  totalRaised: number;
  cause: string;
  country: string;
  media: {
    mainImage: string;
    additionalImages?: string[];
  };
  status: "draft" | "ongoing" | "paused" | "completed";
  donations: IDonation[];
  pendingPayments: IPendingPayment[];
  recurringPayments: IRecurringPayment[];
  pendingRecurringPayments: IPendingRecurringPayment[];
  deadline?: number;
  campaignSlug: string;
  // faqs?: FAQItem[];
  createdAt: Date;
  updatedAt: Date;
  donors?: number;
}

const donationSchema = new Schema({
  donorId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  donorName: {
    type: String,
    required: true,
  },
  donorEmail: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  tipAmount: {
    type: Number,
    required: true,
  },
  message: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
});

const pendingPaymentSchema = new Schema({
  orderId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  tipAmount: {
    type: Number,
    required: true,
  },
  donorName: {
    type: String,
    required: true,
  },
  donorEmail: {
    type: String,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  message: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
});

const recurringPaymentSchema = new Schema({
  paymentToken: { type: String, required: true },
  donorId: { type: Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true },
  tipAmount: { type: Number, required: true },
  donorName: { type: String, required: true },
  donorEmail: { type: String },
  paymentMethod: { type: String, required: true },
  frequency: { type: String, default: "monthly" },
  timestamp: { type: Date, default: Date.now },
});

const pendingRecurringPaymentSchema = new Schema({
  setupTokenId: { type: String, required: true },
  donorId: { type: Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true },
  tipAmount: { type: Number, required: true },
  donorName: { type: String, required: true },
  donorEmail: { type: String },
  paymentMethod: { type: String, required: true },
  frequency: { type: String, default: "monthly" },
  timestamp: { type: Date, default: Date.now },
});

const campaignSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    ngoId: {
      type: Schema.Types.ObjectId,
      ref: "Ngo",
      required: true,
    },
    fundingGoal: {
      type: Number,
      required: true,
    },
    totalRaised: {
      type: Number,
      default: 0,
    },
    cause: {
      type: String,
      required: true,
      enum: [
        "Education & Literacy",
        "Health & Medical Access",
        "Clean Water & Sanitation",
        "Gender Equality & Women Empowerment",
        "Youth Empowerment & Leadership",
        "Agriculture & Food Security",
        "Climate Action & Environmental Sustainability",
        "Economic Development & Livelihoods",
        "Orphan & Vulnerable Children Support",
        "Peacebuilding & Conflict Resolution",
        "HIV/AIDS Awareness & Support",
        "Disability Inclusion & Advocacy",
        "Technology & Digital Inclusion",
        "Emergency Relief & Humanitarian Aid",
        "Mental Health & Psychosocial Support",
        "Other",
      ],
    },
    country: {
      type: String,
      required: true,
    },
    media: {
      mainImage: {
        type: String,
        required: true,
      },
      additionalImages: [String],
    },
    status: {
      type: String,
      enum: ["draft", "ongoing", "paused", "completed"],
      default: "draft",
    },
    donations: [donationSchema],
    pendingPayments: [pendingPaymentSchema],
    recurringPayments: [recurringPaymentSchema],
    pendingRecurringPayments: [pendingRecurringPaymentSchema],
    deadline: {
      type: Number,
    },
    campaignSlug: {
      type: String,
      required: true,
      unique: true,
    },
    // faqs: [
    //   {
    //     question: { type: String, required: true },
    //     answer: { type: String, required: true },
    //   },
    // ],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate a slug if not provided
campaignSchema.pre("save", async function (next) {
  if (this.isNew && !this.campaignSlug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug exists and add unique identifier if needed
    const existingCampaign = await mongoose
      .model("Campaign")
      .findOne({ campaignSlug: baseSlug });

    if (existingCampaign) {
      // Add a unique timestamp to the slug
      this.campaignSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
    } else {
      this.campaignSlug = baseSlug;
    }
  }
  next();
});

export const Campaign = mongoose.model<ICampaign>("Campaign", campaignSchema);
