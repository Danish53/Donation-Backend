// import bcrypt from "bcryptjs";
// import mongoose, { Document, Schema, Types } from "mongoose";

// export interface INgo {
//   name: string;
//   email: string;
//   password: string;
//   profileImage?: string;
//   stripeAccountId?: string | null;

//   // Social Media
//   instagram?: string;
//   twitter?: string;
//   facebook?: string;
//   linkedin?: string;

//   // Organization Details
//   orgName?: string;
//   officialEmail?: string;
//   country?: string;
//   phoneNumber?: string;
//   website?: string;
//   description?: string;

//   // Documents
//   documents?: {
//     registrationCertificate?: string;
//     leadershipProof?: string;
//     additionalDocument?: string;
//   };

//   // Banking Details
//   bankDetails?: {
//     accountHolderName?: string;
//     bankName?: string;
//     accountNumber?: string;
//     routing_number?: string;
//     swiftCode?: string;
//     preferredCurrency?: string;
//     addressLine1?: string;
//     city?: string;
//     province?: string;
//     postal_code?: string;
//     registration_number?: string;
//   };

//   // Status
//   status: "pending" | "approved" | "rejected";
//   registrationDate: Date;
//   profileComplete: boolean;

//   comparePassword(candidatePassword: string): Promise<boolean>;
// }

// // ✅ Extend with mongoose document
// export interface INgoDocument extends INgo, Document {
//   _id: Types.ObjectId;
// }

// const ngoSchema = new Schema(
//   {
//     // Basic Info
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//       lowercase: true,
//     },
//     password: {
//       type: String,
//       required: true,
//     },
//     profileImage: {
//       type: String,
//       required: false,
//     },
//     stripeAccountId: {
//       type: String,
//       default: null,
//     },
//     // Social Media
//     instagram: {
//       type: String,
//       required: false,
//       trim: true,
//     },
//     twitter: {
//       type: String,
//       required: false,
//       trim: true,
//     },
//     facebook: {
//       type: String,
//       required: false,
//       trim: true,
//     },
//     linkedin: {
//       type: String,
//       required: false,
//       trim: true,
//     },

//     // Organization Details
//     orgName: {
//       type: String,
//       required: false,
//       trim: true,
//     },
//     officialEmail: {
//       type: String,
//       required: false,
//       trim: true,
//       lowercase: true,
//     },
//     country: {
//       type: String,
//       required: false,
//     },
//     phoneNumber: {
//       type: String,
//       required: false,
//     },
//     website: {
//       type: String,
//       trim: true,
//     },
//     description: {
//       type: String,
//       required: false,
//     },

//     // Documents
//     documents: {
//       registrationCertificate: {
//         type: String,
//         required: false,
//       },
//       leadershipProof: {
//         type: String,
//         required: false,
//       },
//       additionalDocument: {
//         type: String,
//         required: false,
//       },
//     },

//     // Banking Details
//     bankDetails: {
//       accountHolderName: { type: String },
//       bankName: { type: String },
//       accountNumber: { type: String },
//       routing_number: { type: String },
//       swiftCode: { type: String },
//       preferredCurrency: { type: String },
//       addressLine1: { type: String }, // For Stripe
//       city: { type: String },
//       province: { type: String },
//       postal_code: { type: String },
//       registration_number: { type: String },
//     },
//     // Status
//     status: {
//       type: String,
//       enum: ["pending", "approved", "rejected"],
//       default: "pending",
//     },
//     registrationDate: {
//       type: Date,
//       default: Date.now,
//     },
//     profileComplete: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Hash password before saving
// ngoSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();

//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error: any) {
//     next(error);
//   }
// });

// // Method to compare password
// ngoSchema.methods.comparePassword = async function (
//   candidatePassword: string
// ): Promise<boolean> {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// export const Ngo = mongoose.model<INgo>("Ngo", ngoSchema);


// import bcrypt from "bcryptjs";
// import mongoose, { Document, Schema, Types } from "mongoose";

// // --------------------------------------
// // NGO Interface (TypeScript)
// // --------------------------------------
// export interface INgo {
//   // Basic Info
//   name: string;
//   email: string;
//   password: string;
//   profileImage?: string;

//   // Stripe Integration
//   stripeAccountId?: string | null;
//   stripeRepresentativeId?: string | null,
//   stripeAccountStatus?: string; // e.g. "verified", "restricted", "pending"
//   stripeOnboardingComplete?: boolean;
//   stripeVerificationFiles?: {
//     registrationCertificateFileId?: string;
//     leadershipProofFileId?: string;
//     additionalDocumentFileId?: string;
//   };
//   stripeRequirements?: {
//     currently_due?: string[];
//     eventually_due?: string[];
//     past_due?: string[];
//   };

//   // Social Media
//   instagram?: string;
//   twitter?: string;
//   facebook?: string;
//   linkedin?: string;

//   // Organization Details
//   orgName?: string;
//   officialEmail?: string;
//   country?: string;
//   phoneNumber?: string;
//   website?: string;
//   description?: string;

//   // Documents (local paths or URLs before uploading to Stripe)
//   documents?: {
//     registrationCertificate?: string;
//     leadershipProof?: string;
//     additionalDocument?: string;
//   };

//   // Banking Details (includes SSN + EIN)
//   bankDetails?: {
//     accountHolderName?: string;
//     bankName?: string;
//     accountNumber?: string;
//     routing_number?: string;
//     swiftCode?: string;
//     preferredCurrency?: string;
//     addressLine1?: string;
//     city?: string;
//     province?: string;
//     postal_code?: string;
//     registration_number?: string;
//     // ✅ U.S.-specific fields
//     ein?: string;        // Employer Identification Number (for organization)
//     ssnLast4?: string;   // Last 4 digits of SSN (for individual representative)
//     ssn?: string;   // ✅ Add
//     itin?: string;  // ✅ Add
//     // ✅ Representative details for verification
//     firstName?: string;
//     lastName?: string;
//     dob_day?: number;
//     dob_month?: number;
//     dob_year?: number;
//     representative?: {
//       firstName?: string;
//       lastName?: string;
//       dob?: {
//         day?: number;
//         month?: number;
//         year?: number;
//       };
//     };
//   };

//   // Status
//   status: "pending" | "approved" | "rejected";
//   registrationDate: Date;
//   profileComplete: boolean;
//   paypalStatus: "pending" | "completed";
//   NGOAccountReady?: boolean;
//   paypalMerchantId?: string;
//   paypalOnboardingLink?: string;
//   // Password comparison
//   comparePassword(candidatePassword: string): Promise<boolean>;
// }

// export interface INgoDocument extends INgo, Document {
//   _id: Types.ObjectId;
// }

// // --------------------------------------
// // NGO Schema
// // --------------------------------------
// const ngoSchema = new Schema<INgoDocument>(
//   {
//     // Basic Info
//     name: { type: String, required: true, trim: true },
//     email: { type: String, required: true, unique: true, trim: true, lowercase: true },
//     password: { type: String, required: true },
//     profileImage: { type: String },

//     // Stripe Integration Fields
//     stripeAccountId: { type: String, default: null },
//     stripeRepresentativeId: { type: String },
//     stripeAccountStatus: { type: String, default: "pending" },
//     stripeOnboardingComplete: { type: Boolean, default: false },
//     stripeVerificationFiles: {
//       registrationCertificateFileId: { type: String },
//       leadershipProofFileId: { type: String },
//       additionalDocumentFileId: { type: String },
//     },
//     stripeRequirements: {
//       currently_due: [{ type: String }],
//       eventually_due: [{ type: String }],
//       past_due: [{ type: String }],
//     },

//     // Social Media
//     instagram: { type: String, trim: true },
//     twitter: { type: String, trim: true },
//     facebook: { type: String, trim: true },
//     linkedin: { type: String, trim: true },

//     // Organization Details
//     orgName: { type: String, trim: true },
//     officialEmail: { type: String, trim: true, lowercase: true },
//     country: { type: String },
//     phoneNumber: { type: String },
//     website: { type: String, trim: true },
//     description: { type: String },

//     // Documents
//     documents: {
//       registrationCertificate: { type: String },
//       leadershipProof: { type: String },
//       additionalDocument: { type: String },
//     },

//     // Banking + U.S. Verification Details
//     bankDetails: {
//       accountHolderName: { type: String },
//       bankName: { type: String },
//       accountNumber: { type: String },
//       routing_number: { type: String },
//       swiftCode: { type: String },
//       preferredCurrency: { type: String },
//       addressLine1: { type: String },
//       city: { type: String },
//       province: { type: String },
//       postal_code: { type: String },
//       registration_number: { type: String },
//       ein: { type: String },        // ✅ EIN field
//       ssnLast4: { type: String },   // ✅ SSN last 4 digits
//       ssn: { type: String },  // ✅ Add this
//       itin: { type: String }, // ✅ Add this
//       firstName: { type: String },
//       lastName: { type: String },
//       dob_day: { type: Number },
//       dob_month: { type: Number },
//       dob_year: { type: Number },
//       representative: {
//         firstName: { type: String },
//         lastName: { type: String },
//         dob: {
//           day: { type: Number },
//           month: { type: Number },
//           year: { type: Number },
//         },
//       },
//     },

//     // Status & Meta
//     status: {
//       type: String,
//       enum: ["pending", "approved", "rejected"],
//       default: "pending",
//     },
//     paypalOnboardingLink: { type: String },
//     paypalStatus: { type: String, enum: ["pending", "completed"] },
//     paypalMerchantId: { type: String },
//     NGOAccountReady: { type: Boolean, default: false },
//     registrationDate: { type: Date, default: Date.now },
//     profileComplete: { type: Boolean, default: false },
//   },
//   {
//     timestamps: true,
//   }
// );

// // --------------------------------------
// // Hash Password Before Saving
// // --------------------------------------
// ngoSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error: any) {
//     next(error);
//   }
// });

// // --------------------------------------
// // Compare Password Method
// // --------------------------------------
// ngoSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// // --------------------------------------
// // Export Model
// // --------------------------------------
// export const Ngo = mongoose.model<INgoDocument>("Ngo", ngoSchema);


import bcrypt from "bcryptjs";
import mongoose, { Document, Schema, Types } from "mongoose";

// --------------------------------------
// NGO Interface (TypeScript)
// --------------------------------------
export interface INgo {
  // Basic Auth / Account Info
  name: string;               // display / login name
  email: string;              // login email
  password: string;
  profileImage?: string;

  // Stripe Integration
  stripeAccountId?: string | null;
  stripeRepresentativeId?: string | null;
  stripeAccountStatus?: string; // e.g. "verified", "restricted", "pending"
  stripeOnboardingComplete?: boolean;
  stripeVerificationFiles?: {
    registrationCertificateFileId?: string;
    leadershipProofFileId?: string;
    additionalDocumentFileId?: string;
  };
  stripeRequirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
  };

  // Social Media
  instagram?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;

  // OLD Organization Details
  orgName?: string;
  officialEmail?: string;
  country?: string;
  phoneNumber?: string;
  website?: string;
  description?: string;

  // ---------- NEW: Multi‑step onboarding fields (match frontend) ----------

  // SECTION 1 — Account / Org identity
  organizationName?: string;
  organizationEmail?: string;
  isAuthorized?: boolean;

  // SECTION 2 — Identity
  organizationType?: string;
  organizationTypeOther?: string;
  causeType?: string;
  causeTypeOther?: string;

  // SECTION 3 — Location
  city?: string;

  // SECTION 4 — Leadership & Contact
  primaryContactName?: string;
  primaryContactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;

  // SECTION 5 — Online presence
  socialLinks?: string;

  // SECTION 6 — About work
  missionStatement?: string;
  programs?: string[];
  programsOther?: string;
  workSamples?: string;

  // SECTION 7 — Simple banking details from onboarding
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bankCountry?: string;

  // SECTION 8 — Logo
  logoUrl?: string;

  // SECTION 9 — Agreements
  verificationConfirmed?: boolean;
  termsAccepted?: boolean;

  // Documents (local paths or URLs before uploading to Stripe)
  documents?: {
    registrationCertificate?: string;
    leadershipProof?: string;
    additionalDocument?: string;
  };

  // Banking Details (includes SSN + EIN) – used for Stripe
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    routing_number?: string;
    swiftCode?: string;
    preferredCurrency?: string;
    addressLine1?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    registration_number?: string;
    ein?: string;
    ssnLast4?: string;
    ssn?: string;
    itin?: string;
    firstName?: string;
    lastName?: string;
    dob_day?: number;
    dob_month?: number;
    dob_year?: number;
    representative?: {
      firstName?: string;
      lastName?: string;
      dob?: {
        day?: number;
        month?: number;
        year?: number;
      };
    };
  };

  // Status
  status: "pending" | "approved" | "rejected";
  registrationDate: Date;
  profileComplete: boolean;
  paypalStatus: "pending" | "completed";
  NGOAccountReady?: boolean;
  paypalMerchantId?: string;
  paypalOnboardingLink?: string;

  // Password comparison
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface INgoDocument extends INgo, Document {
  _id: Types.ObjectId;
}

// --------------------------------------
// NGO Schema
// --------------------------------------
const ngoSchema = new Schema<INgoDocument>(
  {
    // Basic Info
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    profileImage: { type: String },

    // Stripe Integration Fields
    stripeAccountId: { type: String, default: null },
    stripeRepresentativeId: { type: String },
    stripeAccountStatus: { type: String, default: "pending" },
    stripeOnboardingComplete: { type: Boolean, default: false },
    stripeVerificationFiles: {
      registrationCertificateFileId: { type: String },
      leadershipProofFileId: { type: String },
      additionalDocumentFileId: { type: String },
    },
    stripeRequirements: {
      currently_due: [{ type: String }],
      eventually_due: [{ type: String }],
      past_due: [{ type: String }],
    },

    // Social Media
    instagram: { type: String, trim: true },
    twitter: { type: String, trim: true },
    facebook: { type: String, trim: true },
    linkedin: { type: String, trim: true },

    // OLD Organization Details
    orgName: { type: String, trim: true },
    officialEmail: { type: String, trim: true, lowercase: true },
    country: { type: String },
    phoneNumber: { type: String },
    website: { type: String, trim: true },
    description: { type: String },

    // ---------- NEW: Multi‑step onboarding fields ----------

    // SECTION 1
    organizationName: { type: String, trim: true },
    organizationEmail: { type: String, trim: true, lowercase: true },
    isAuthorized: { type: Boolean, default: false },

    // SECTION 2
    organizationType: { type: String, trim: true },
    organizationTypeOther: { type: String, trim: true },
    causeType: { type: String, trim: true },
    causeTypeOther: { type: String, trim: true },

    // SECTION 3
    city: { type: String, trim: true },

    // SECTION 4
    primaryContactName: { type: String, trim: true },
    primaryContactTitle: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },

    // SECTION 5
    socialLinks: { type: String },

    // SECTION 6
    missionStatement: { type: String },
    programs: [{ type: String }],
    programsOther: { type: String },
    workSamples: { type: String },

    // SECTION 7
    bankName: { type: String },
    accountName: { type: String },
    accountNumber: { type: String },
    bankCountry: { type: String },

    // SECTION 8
    logoUrl: { type: String },

    // SECTION 9
    verificationConfirmed: { type: Boolean, default: false },
    termsAccepted: { type: Boolean, default: false },

    // Documents
    documents: {
      registrationCertificate: { type: String },
      leadershipProof: { type: String },
      additionalDocument: { type: String },
    },

    // Banking + U.S. Verification Details (Stripe)
    bankDetails: {
      accountHolderName: { type: String },
      bankName: { type: String },
      accountNumber: { type: String },
      routing_number: { type: String },
      swiftCode: { type: String },
      preferredCurrency: { type: String },
      addressLine1: { type: String },
      city: { type: String },
      province: { type: String },
      postal_code: { type: String },
      registration_number: { type: String },
      ein: { type: String },
      ssnLast4: { type: String },
      ssn: { type: String },
      itin: { type: String },
      firstName: { type: String },
      lastName: { type: String },
      dob_day: { type: Number },
      dob_month: { type: Number },
      dob_year: { type: Number },
      representative: {
        firstName: { type: String },
        lastName: { type: String },
        dob: {
          day: { type: Number },
          month: { type: Number },
          year: { type: Number },
        },
      },
    },

    // Status & Meta
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    paypalOnboardingLink: { type: String },
    paypalStatus: { type: String, enum: ["pending", "completed"] },
    paypalMerchantId: { type: String },
    NGOAccountReady: { type: Boolean, default: false },
    registrationDate: { type: Date, default: Date.now },
    profileComplete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// --------------------------------------
// Hash Password Before Saving
// --------------------------------------
ngoSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// --------------------------------------
// Compare Password Method
// --------------------------------------
ngoSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// --------------------------------------
// Export Model
// --------------------------------------
export const Ngo = mongoose.model<INgoDocument>("Ngo", ngoSchema);

