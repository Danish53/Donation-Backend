import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Campaign } from "../models/Campaign";
import { INgoDocument, Ngo } from "../models/Ngo";
import { emailService } from "../utils/emailService";
import path from "path";
import fs from "fs";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

import Stripe from "stripe";
import axios from "axios";
import OrganizationType from "../models/OrganizationType";
import CauseType from "../models/CauseType";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil" as any,
});

export interface INgo extends Document {
  name: string;
  email: string;
  password: string;
  profileImage?: string;
  stripeAccountId?: string; // ✅ Add this line
  instagram?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  ssn?: string;   // ✅ Add
  itin?: string;  // ✅ Add
  ein?: string;
  orgName?: string;
  officialEmail?: string;
  country?: string;
  phoneNumber?: string;
  website?: string;
  description?: string;
  organizationType?: string;
  organizationTypeOther?: string;
  causeType?: string;
  causeTypeOther?: string;
  city?: string;

  documents?: {
    registrationCertificate?: string;
    leadershipProof?: string;
    additionalDocument?: string;
  };

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
  };

  status?: "pending" | "approved" | "rejected";
  NGOAccountReady?: boolean;
  profileComplete?: boolean;
  registrationDate?: Date;

}

interface PaypalOnboardingParams {
  ngoId: string;
}

const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const ngoController = {
  // registerBasic: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const { name, email, password, instagram, twitter, facebook, linkedin } =
  //       req.body;

  //     const existingNgo = await Ngo.findOne({ email });
  //     if (existingNgo) {
  //       res.status(400).json({ message: "Email already registered" });
  //       return;
  //     }

  //     const ngo = new Ngo({
  //       name,
  //       email,
  //       password: password,
  //       instagram,
  //       twitter,
  //       facebook,
  //       linkedin,
  //       status: "pending",
  //     });

  //     await ngo.save();

  //     // Send welcome email
  //     // await emailService.sendWelcomeEmail(ngo.email, ngo.name);

  //     const token = jwt.sign({ userId: ngo._id }, JWT_SECRET, {
  //       expiresIn: "24h",
  //     });

  //     res.status(201).json({
  //       message: "Basic registration successful",
  //       token,
  //       ngo: {
  //         id: ngo._id,
  //         name: ngo.name,
  //         email: ngo.email,
  //         instagram: ngo.instagram,
  //         twitter: ngo.twitter,
  //         facebook: ngo.facebook,
  //         linkedin: ngo.linkedin,
  //         status: ngo.status,
  //       },
  //     });
  //   } catch (error) {
  //     console.log(error, "erorororororo")
  //     res.status(500).json({ message: "Error registering NGO", error });
  //   }
  // },

  // Complete NGO profile


  // src/controllers/ngoController.ts

  // src/controllers/ngoController.ts

  registerBasic: async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      // SECTION 1
      organizationName,
      organizationEmail,
      password,
      confirmPassword,
      isAuthorized,

      // SECTION 2
      organizationType,
      organizationTypeOther,
      causeType,
      causeTypeOther,

      // SECTION 3
      country,
      city,

      // SECTION 4
      primaryContactName,
      primaryContactTitle,
      contactEmail,
      contactPhone,

      // SECTION 5
      website,
      socialLinks,

      // SECTION 6
      missionStatement,
      programs,              // <- as‑is from body (string ya array dono ho sakte)
      programsOther,
      workSamples,

      // SECTION 7
      bankName,
      accountName,
      accountNumber,
      bankCountry,

      // SECTION 9
      verificationConfirmed,
      termsAccepted,

      instagram,
      twitter,
      facebook,
      linkedin,
    } = req.body;

    const profileImage = req.file ? req.file.path : undefined;

    // ---------- normalize programs (string | string[] -> string[]) ----------
    let normalizedPrograms: string[] = [];

    if (Array.isArray(programs)) {
      normalizedPrograms = programs;
    } else if (typeof programs === "string") {
      // "A, B, C" -> ["A", "B", "C"]
      normalizedPrograms = programs
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    }

    const sanitizedPrograms: string[] = normalizedPrograms.filter(
      (p) => !!p && p.trim() !== ""
    );

    // ---------- VALIDATION ----------

    // (yahan tumhara baqi validation code as‑is rahe, sirf programs wala hissa change karo)

    if (!missionStatement?.trim()) {
      res
        .status(400)
        .json({ message: "Mission statement is required." });
      return;
    }

    if (sanitizedPrograms.length === 0) {
      res.status(400).json({
        message: "Please select at least one program or activity.",
      });
      return;
    }

    if (sanitizedPrograms.length > 3) {
      res.status(400).json({
        message: "You can select up to 3 programs only.",
      });
      return;
    }

    if (
      sanitizedPrograms.includes("Other") &&
      !programsOther?.trim()
    ) {
      res
        .status(400)
        .json({ message: "Please specify your other program(s)." });
      return;
    }

    // ... baqi validation (country, banking, agreements, etc.) same as pehle ...

    // Email duplicate check
    const existingNgo = await Ngo.findOne({ email: organizationEmail });
    if (existingNgo) {
      res.status(400).json({ message: "Email already registered" });
      return;
    }

    // ---------- Create NGO ----------
    const ngo: INgoDocument = new Ngo({
      name: organizationName,
      email: organizationEmail,
      password,                // pre-save hook pe hash ho jayega
      status: "pending",

      instagram,
      twitter,
      facebook,
      linkedin,

      // legacy fields bhi fill kar sakte ho:
      orgName: organizationName,
      officialEmail: organizationEmail,
      country,

      // new multi-step fields
      organizationName,
      organizationEmail,
      isAuthorized: !!isAuthorized,

      organizationType,
      organizationTypeOther,
      causeType,
      causeTypeOther,
      city,

      primaryContactName,
      primaryContactTitle,
      contactEmail,
      contactPhone,

      website,
      socialLinks,
      profileImage,

      missionStatement,
      programs: sanitizedPrograms,  // <- yahan ab hamesha array hai
      programsOther,
      workSamples,

      bankName,
      accountName,
      accountNumber,
      bankCountry,
      verificationConfirmed: !!verificationConfirmed,
      termsAccepted: !!termsAccepted,
    });

    await ngo.save();

    const token = jwt.sign({ userId: ngo._id }, JWT_SECRET, {
      expiresIn: "24h",
    });

    console.log(ngo, "new ngo created...");

    res.status(201).json({
      message: "Registration successful",
      token,
      ngo: {
        id: ngo._id,
        name: ngo.name,
        email: ngo.email,
        status: ngo.status,
        organizationType: ngo.organizationType,
        causeType: ngo.causeType,
        country: ngo.country,
        city: ngo.city,
        profileImage: ngo.profileImage,
      },
    });
  } catch (error) {
    console.error("Error registering NGO:", error);
    res.status(500).json({ message: "Error registering NGO", error });
  }
  },
  
  completeProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        orgName,
        officialEmail,
        country,
        phoneNumber,
        website,
        description,
        bankDetails,
        instagram,
        twitter,
        facebook,
        linkedin,
      } = req.body;

      // Get the NGO ID from authenticated user
      const ngoId = req.user?.id;

      // Update NGO profile with all required fields
      const updateData = {
        orgName,
        officialEmail,
        country,
        phoneNumber,
        website,
        description,
        bankDetails,
        instagram,
        twitter,
        facebook,
        linkedin,
        profileComplete: true, // Mark profile as complete
      };

      // Update NGO profile
      const updatedNgo = await Ngo.findByIdAndUpdate(ngoId, updateData, {
        new: true,
      });

      if (!updatedNgo) {
        res.status(404).json({ message: "NGO not found" });
        return;
      }

      res.json({
        message: "Profile updated successfully",
        ngo: {
          id: updatedNgo._id,
          name: updatedNgo.name,
          orgName: updatedNgo.orgName,
          instagram: updatedNgo.instagram,
          twitter: updatedNgo.twitter,
          facebook: updatedNgo.facebook,
          linkedin: updatedNgo.linkedin,
          status: updatedNgo.status,
          profileComplete: updatedNgo.profileComplete,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Error updating profile", error });
    }
  },

  // Upload documents
  uploadDocuments: async (req: Request, res: Response): Promise<void> => {
    try {
      const ngoId = req.user?.id;

      if (!req.files) {
        res.status(400).json({ message: "No files uploaded" });
        return;
      }

      const files = req.files as {
        registrationCertificate?: Express.Multer.File[];
        leadershipProof?: Express.Multer.File[];
        additionalDocument?: Express.Multer.File[];
      };

      const documents = {
        registrationCertificate: files.registrationCertificate?.[0]?.path || "",
        leadershipProof: files.leadershipProof?.[0]?.path || "",
        additionalDocument: files.additionalDocument?.[0]?.path || "",
      };

      const updatedNgo = await Ngo.findByIdAndUpdate(
        ngoId,
        { documents },
        { new: true }
      );

      if (!updatedNgo) {
        res.status(404).json({ message: "NGO not found" });
        return;
      }

      res.json({
        message: "Documents uploaded successfully",
        documents: updatedNgo.documents,
      });
    } catch (error) {
      res.status(500).json({ message: "Error uploading documents", error });
    }
  },

  // Update NGO Bank Details
  // completeBankdetails: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const ngoId = req.user?.id;

  //     if (!ngoId) {
  //       res.status(400).json({ message: "NGO ID is required" });
  //       return
  //     }

  //     const {
  //       registration_number,
  //       preferredCurrency,
  //       accountHolderName,
  //       accountNumber,
  //       routing_number,
  //       addressLine1,
  //       city,
  //       province,
  //       postal_code,
  //       ssn, // Social Security Number
  //       itin, // Individual Taxpayer Identification Number
  //       ein, // Employer Identification Number
  //       firstName,
  //       lastName,
  //       dob_day,
  //       dob_month,
  //       dob_year,
  //     } = req.body;

  //     // Ensure at least one field is provided
  //     if (
  //       !registration_number &&
  //       !preferredCurrency &&
  //       !accountHolderName &&
  //       !accountNumber &&
  //       !routing_number &&
  //       !ssn &&
  //       !itin &&
  //       !ein &&
  //       !firstName &&
  //       !lastName &&
  //       !dob_day &&
  //       !dob_month &&
  //       !dob_year
  //     ) {
  //       res
  //         .status(400)
  //         .json({ message: "Please provide at least one bank or representative detail." });
  //       return;
  //     }

  //     const ngo = await Ngo.findById(ngoId);
  //     if (!ngo) {
  //       res.status(404).json({ message: "NGO not found" });
  //       return
  //     };

  //     if (!ngo.profileComplete) {
  //       res.status(400).json({ message: "NGO profile is not complete yet" });
  //       return
  //     }

  //     // ✅ Step 1: Validate EIN / SSN
  //     ein?.replace(/[^0-9]/g, "");
  //     if (!ein || ein.length !== 9) {
  //       res.status(400).json({ message: "Invalid EIN format — must be 9 numeric digits only" });
  //       return
  //     }

  //     console.log(ein, "ein tax_id.....");
  //     console.log(ngo?.phoneNumber, "phone nuymber add.....")

  //     const ssnLast4 = ngo.bankDetails?.ssnLast4?.replace(/[^0-9]/g, "");
  //     if (ssnLast4 && ssnLast4.length !== 4) {
  //       res.status(400).json({ message: "Invalid SSN last 4 digits — must be 4 numbers" });
  //       return
  //     }

  //     // ✅ Step 2: Pre-validate required fields for Stripe
  //     const requiredFields = [
  //       ngo.orgName,
  //       ngo.officialEmail,
  //       ngo.bankDetails?.accountHolderName,
  //       ngo.bankDetails?.accountNumber,
  //       ngo.bankDetails?.routing_number,
  //       ngo.bankDetails?.addressLine1,
  //       ngo.bankDetails?.city,
  //       ngo.bankDetails?.province,
  //       ngo.bankDetails?.postal_code,
  //     ];

  //     if (requiredFields.some(f => !f)) {
  //       res.status(400).json({ message: "Missing required NGO or bank details" });
  //       return
  //     }

  //     // ✅ Step 3: Create Stripe Custom Account
  //     const account = await stripe.accounts.create({
  //       type: "custom",
  //       country: ngo.country || "US",
  //       email: ngo.officialEmail,
  //       business_type: "company",
  //       business_profile: {
  //         name: ngo.orgName,
  //         url: ngo.website || "https://example.org",
  //         product_description: ngo.description || "Non-profit organization",
  //         mcc: "8398",
  //         support_phone: ngo.phoneNumber?.trim() || "+12025550123",
  //       },
  //       external_account: {
  //         object: "bank_account",
  //         country: ngo.country || "US",
  //         currency: (ngo.bankDetails?.preferredCurrency || "usd").toLowerCase(),
  //         account_holder_name: ngo?.bankDetails?.accountHolderName || "",
  //         account_number: ngo?.bankDetails?.accountNumber || "",
  //         routing_number: ngo?.bankDetails?.routing_number || "",
  //       },
  //       capabilities: {
  //         card_payments: { requested: true },
  //         transfers: { requested: true },
  //       },
  //       tos_acceptance: {
  //         date: Math.floor(Date.now() / 1000),
  //         ip: req.ip || "127.0.0.1",
  //       },
  //     });

  //     console.log(account, "account dataaa...")

  //     await new Promise(resolve => setTimeout(resolve, 1500));

  //     await stripe.accounts.update(account.id, {
  //       company: {
  //         phone: ngo?.phoneNumber?.trim() || "+12025550123",
  //         tax_id: "000000000",
  //         address: {
  //           line1: ngo?.bankDetails?.addressLine1 || "",
  //           city: ngo?.bankDetails?.city || "",
  //           state: ngo?.bankDetails?.province || "",
  //           postal_code: ngo?.bankDetails?.postal_code || "",
  //           country: ngo.country || "US",
  //         },
  //         name: ngo.orgName,
  //       },
  //     });

  //     // ✅ Step 4: Create Representative
  //     const representative = await stripe.accounts.createPerson(account.id, {
  //       first_name: ngo.bankDetails?.firstName || "John",
  //       last_name: ngo.bankDetails?.lastName || "Doe",
  //       email: ngo.officialEmail,
  //       phone: ngo.phoneNumber || "+12025550123",
  //       ssn_last_4: ssnLast4 || "0000",
  //       dob: {
  //         day: ngo.bankDetails?.dob_day || 1,
  //         month: ngo.bankDetails?.dob_month || 1,
  //         year: ngo.bankDetails?.dob_year || 1980,
  //       },
  //       relationship: { representative: true, title: "Director", percent_ownership: 100 },
  //       address: {
  //         line1: ngo?.bankDetails?.addressLine1 || "",
  //         city: ngo?.bankDetails?.city || "",
  //         state: ngo?.bankDetails?.province || "",
  //         postal_code: ngo?.bankDetails?.postal_code || "",
  //         country: ngo.country || "US",
  //       },

  //     });

  //     // ✅ Step 5: Dynamic check for missing required info
  //     const accountDetails = await stripe.accounts.retrieve(account.id);
  //     const missingFields = accountDetails.requirements?.currently_due || [];
  //     if (missingFields.length) {
  //       res.status(400).json({
  //         message: "Stripe requires additional info:", missingFields
  //       });
  //       return
  //     }


  //     // Build bank + representative details object
  //     const bankDetails = {
  //       registration_number,
  //       preferredCurrency,
  //       accountHolderName,
  //       accountNumber,
  //       routing_number,
  //       addressLine1,
  //       city,
  //       province,
  //       postal_code,
  //       ssn,
  //       itin,
  //       ein,
  //       representative: {
  //         firstName,
  //         lastName,
  //         dob: {
  //           day: dob_day,
  //           month: dob_month,
  //           year: dob_year,
  //         },
  //       },
  //     };

  //     // Update NGO record in MongoDB
  //     const updatedNgo = await Ngo.findByIdAndUpdate(
  //       ngoId,
  //       { bankDetails },
  //       { new: true }
  //     );

  //     if (!updatedNgo) {
  //       res.status(404).json({ message: "NGO not found" });
  //       return;
  //     }

  //     ngo.stripeAccountId = account.id;
  //     ngo.stripeRepresentativeId = representative.id;
  //     await ngo.save();

  //     res.json({
  //       message: "Bank and representative details updated successfully",
  //       bankDetails: updatedNgo.bankDetails,
  //       stripeAccountId: ngo.stripeAccountId,
  //       stripeRepresentativeId: ngo.stripeRepresentativeId,
  //     });
  //   } catch (error) {
  //     console.error("Error updating bank details:", error);
  //     res.status(500).json({ message: "Error updating bank details", error });
  //   }
  // },
  // completeBankDetails: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const ngoId = req.user?.id;
  //     if (!ngoId) {
  //       res.status(400).json({ message: "NGO ID is required" });
  //       return;
  //     }

  //     // Extract data
  //     const {
  //       registration_number,
  //       preferredCurrency,
  //       accountHolderName,
  //       accountNumber,
  //       routing_number,
  //       addressLine1,
  //       country,
  //       city,
  //       province,
  //       postal_code,
  //       ssn,
  //       itin,
  //       ein,
  //       firstName,
  //       lastName,
  //       dob_day,
  //       dob_month,
  //       dob_year,
  //     } = req.body;

  //     // Validate fields
  //     if (
  //       !accountHolderName ||
  //       !accountNumber ||
  //       !routing_number ||
  //       !addressLine1 ||
  //       !city ||
  //       !province ||
  //       !postal_code ||
  //       !firstName ||
  //       !lastName ||
  //       !dob_day ||
  //       !dob_month ||
  //       !dob_year ||
  //       !country
  //     ) {
  //       res.status(400).json({ message: "Missing required bank or representative details" });
  //       return;
  //     }

  //     const ngo = await Ngo.findById(ngoId);
  //     if (!ngo) {
  //       res.status(404).json({ message: "NGO not found" });
  //       return;
  //     }

  //     if (!ngo.profileComplete) {
  //       res.status(400).json({ message: "NGO profile is not complete yet" });
  //       return;
  //     }

  //     // ✅ Step 1: Check if Stripe supports NGO’s country
  //     const supportedCountries = await stripe.countrySpecs.list();
  //     const countrySupported = supportedCountries.data.some(
  //       (c) => c.id === (ngo.country || "").toUpperCase()
  //     );

  //     if (!countrySupported) {
  //       res.status(400).json({
  //         message: `Stripe does not currently support payouts in ${ngo.country}.`,
  //       });
  //       return;
  //     }

  //     // ✅ Step 2: Create Stripe Custom Account
  //     const account = await stripe.accounts.create({
  //       type: "custom",
  //       country: ngo.country || "US",
  //       email: ngo.officialEmail,
  //       business_type: "company",
  //       business_profile: {
  //         name: ngo.orgName,
  //         url: ngo.website || "https://example.org",
  //         product_description: ngo.description || "Non-profit organization",
  //         mcc: "8398",
  //         support_phone: ngo.phoneNumber?.trim() || "+12025550123",
  //       },
  //       capabilities: {
  //         card_payments: { requested: true },
  //         transfers: { requested: true },
  //       },
  //       external_account: {
  //         object: "bank_account",
  //         country: ngo.country || "US",
  //         currency: (preferredCurrency || "usd").toLowerCase(),
  //         account_holder_name: accountHolderName,
  //         account_number: accountNumber,
  //         routing_number,
  //       },
  //       tos_acceptance: {
  //         date: Math.floor(Date.now() / 1000),
  //         ip: req.ip || "127.0.0.1",
  //       },
  //     });

  //     console.log("✅ Stripe Account Created:", account.id);

  //     // ✅ Step 3: Add company info (tax + address)
  //     await stripe.accounts.update(account.id, {
  //       company: {
  //         name: ngo.orgName,
  //         phone: ngo.phoneNumber?.trim() || "+12025550123",
  //         tax_id: ein || "000000000",
  //         address: {
  //           line1: addressLine1,
  //           city,
  //           state: province,
  //           postal_code,
  //           country: ngo.country || "US",
  //         },
  //       },
  //     });

  //     // ✅ Step 4: Create Representative (Person)
  //     const representative = await stripe.accounts.createPerson(account.id, {
  //       first_name: firstName,
  //       last_name: lastName,
  //       email: ngo.officialEmail,
  //       phone: ngo.phoneNumber || "+12025550123",
  //       ssn_last_4: ssn ? ssn.slice(-4) : undefined,
  //       dob: {
  //         day: dob_day,
  //         month: dob_month,
  //         year: dob_year,
  //       },
  //       relationship: { representative: true, title: "Director", percent_ownership: 100 },
  //       address: {
  //         line1: addressLine1,
  //         city,
  //         state: province,
  //         postal_code,
  //         country: ngo.country || "US",
  //       },
  //     });

  //     console.log("✅ Representative Created:", representative.id);

  //     // ✅ Step 5: Check for missing requirements
  //     const accountDetails = await stripe.accounts.retrieve(account.id);
  //     const missing = accountDetails.requirements?.currently_due || [];

  //     if (missing.length) {
  //       res.status(400).json({
  //         message: "Stripe requires additional information",
  //         missingFields: missing,
  //       });
  //       return;
  //     }

  //     // ✅ Step 6: Save to MongoDB
  //     ngo.bankDetails = {
  //       registration_number,
  //       preferredCurrency,
  //       accountHolderName,
  //       accountNumber,
  //       routing_number,
  //       addressLine1,
  //       city,
  //       province,
  //       postal_code,
  //       ssn,
  //       itin,
  //       ein,
  //       representative: {
  //         firstName,
  //         lastName,
  //         dob: { day: dob_day, month: dob_month, year: dob_year },
  //       },
  //     };

  //     ngo.stripeAccountId = account.id;
  //     ngo.stripeRepresentativeId = representative.id;
  //     await ngo.save();

  //     res.json({
  //       message: "✅ NGO Stripe account created successfully",
  //       stripeAccountId: ngo.stripeAccountId,
  //       stripeRepresentativeId: ngo.stripeRepresentativeId,
  //       bankDetails: ngo.bankDetails,
  //     });
  //   } catch (error: any) {
  //     console.error("❌ Error creating Stripe account:", error);
  //     if (error.raw && error.raw.message) {
  //       res.status(400).json({ message: error.raw.message });
  //     } else {
  //       res.status(500).json({ message: "Server error creating Stripe account" });
  //     }
  //   }
  // },

  // Admin: Approve NGO
  // approveNgo: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const { ngoId } = req.params;

  //     if (!ngoId) {
  //       res.status(400).json({ message: "NGO ID is required" });
  //       return;
  //     }

  //     const ngo = await Ngo.findByIdAndUpdate(
  //       ngoId,
  //       { status: "approved" },
  //       { new: true }
  //     );

  //     if (!ngo) {
  //       res.status(404).json({ message: "NGO not found" });
  //       return;
  //     }

  //     // Send approval email
  //     await emailService.sendApprovalEmail(ngo.email, ngo.name, true);

  //     res.json({
  //       message: "NGO approved successfully",
  //       ngo: {
  //         id: ngo._id,
  //         name: ngo.name,
  //         email: ngo.email,
  //         status: ngo.status,
  //       },
  //     });
  //   } catch (error) {
  //     res.status(500).json({ message: "Error approving NGO", error });
  //   }
  // },

  // completeBankDetails: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const { ngoId } = req.params;
  //     if (!ngoId) {
  //       res.status(400).json({ success: false, message: "NGO ID is required" });
  //       return;
  //     }

  //     // Extract data from request body
  //     const {
  //       registration_number,
  //       preferredCurrency,
  //       accountHolderName,
  //       accountNumber,
  //       routing_number,
  //       addressLine1,
  //       country,
  //       city,
  //       province,
  //       postal_code,
  //       ssn,
  //       itin,
  //       ein,
  //       firstName,
  //       lastName,
  //       dob_day,
  //       dob_month,
  //       dob_year,
  //     } = req.body;

  //     // ✅ Required field validation
  //     const requiredFields = {
  //       accountHolderName,
  //       accountNumber,
  //       addressLine1,
  //       city,
  //       postal_code,
  //       firstName,
  //       lastName,
  //       dob_day,
  //       dob_month,
  //       dob_year,
  //       country,
  //       preferredCurrency,
  //     };

  //     for (const [key, value] of Object.entries(requiredFields)) {
  //       if (!value) {
  //         res.status(400).json({
  //           success: false,
  //           message: `Missing required field: ${key}`,
  //         });
  //         return;
  //       }
  //     }

  //     const ngo = await Ngo.findById(ngoId);
  //     if (!ngo) {
  //       res.status(404).json({ success: false, message: "NGO not found" });
  //       return;
  //     }

  //     if (!ngo.profileComplete) {
  //       res.status(400).json({ success: false, message: "NGO profile is incomplete" });
  //       return;
  //     }

  //     // ✅ 1. Check if country is supported by Stripe
  //     try {
  //       await stripe.countrySpecs.retrieve(country.toUpperCase());
  //     } catch (err) {
  //       res.status(400).json({
  //         success: false,
  //         message: `Stripe does not currently support payouts in ${country}. Please choose a supported country.`,
  //       });
  //       return;
  //     }

  //     // ✅ 1.1 Validate SSN / ITIN for U.S. accounts
  //     if (country.toUpperCase() === "US") {
  //       if ((!ssn || ssn.trim() === "") && (!itin || itin.trim() === "")) {
  //         res.status(400).json({
  //           success: false,
  //           message:
  //             "For U.S. accounts, either SSN (last 4 digits) or ITIN is required to verify identity.",
  //         });
  //         return;
  //       }

  //       if (ssn && !/^\d{4}$/.test(ssn.trim())) {
  //         res.status(400).json({
  //           success: false,
  //           message: "Invalid SSN format. Provide the last 4 digits only.",
  //         });
  //         return;
  //       }

  //       if (itin && !/^9\d{8}$/.test(itin.trim())) {
  //         res.status(400).json({
  //           success: false,
  //           message:
  //             "Invalid ITIN format. It should be 9 digits starting with 9 (e.g. 900700000).",
  //         });
  //         return;
  //       }
  //     }

  //     if (country === "ZA" && !/^[A-Z]{4}ZA[A-Z]{2,3}$/.test(routing_number)) {
  //       res.status(400).json({
  //         success: false,
  //         message:
  //           "Invalid South Africa routing number. Use BIC format like ABSAZAJJ or FIRNZAJJ.",
  //       });
  //       return;
  //     }

  //     // ✅ 2. Create Stripe Account
  //     let account;
  //     try {
  //       account = await stripe.accounts.create({
  //         type: "custom",
  //         country: country.toUpperCase(),
  //         email: ngo.officialEmail,
  //         business_type: "company",
  //         business_profile: {
  //           name: ngo.orgName,
  //           url: ngo.website || "https://example.org",
  //           product_description: ngo.description || "Non-profit organization",
  //           mcc: "8398",
  //           support_phone: ngo.phoneNumber?.trim() || "+12025550123",
  //         },
  //         capabilities: {
  //           transfers: { requested: true },
  //           card_payments: { requested: true },
  //         },
  //         external_account: {
  //           object: "bank_account",
  //           country: country.toUpperCase(),
  //           currency: preferredCurrency.toLowerCase(),
  //           account_holder_name: accountHolderName,
  //           account_number: accountNumber,
  //           routing_number: routing_number || undefined,
  //         },
  //         tos_acceptance: {
  //           date: Math.floor(Date.now() / 1000),
  //           ip: req.ip || "127.0.0.1",
  //         },
  //       });
  //     } catch (stripeError: any) {
  //       console.error("❌ Stripe Account Create Error:", stripeError);
  //       const message = stripeError?.raw?.message || "Invalid bank or country details.";
  //       res.status(400).json({ success: false, message });
  //       return;
  //     }

  //     // ✅ 3. Add organization info
  //     try {
  //       await stripe.accounts.update(account.id, {
  //         company: {
  //           name: ngo.orgName,
  //           phone: ngo.phoneNumber?.trim() || "+12025550123",
  //           tax_id: ein || undefined,
  //           address: {
  //             line1: addressLine1,
  //             city,
  //             state: province,
  //             postal_code,
  //             country: country.toUpperCase(),
  //           },
  //         },
  //       });
  //     } catch (updateError: any) {
  //       console.error("❌ Stripe Account Update Error:", updateError);
  //       const message = updateError?.raw?.message || "Invalid organization information.";
  //       res.status(400).json({ success: false, message });
  //       return;
  //     }

  //     // ✅ 4. Create representative (person)
  //     let representative;
  //     try {
  //       const personData: any = {
  //         first_name: firstName,
  //         last_name: lastName,
  //         email: ngo.officialEmail,
  //         phone: ngo.phoneNumber || "+12025550123",
  //         ssn_last_4: process.env.NODE_ENV === "production" ? ssn?.slice(-4) : "0000",
  //         dob: { day: dob_day, month: dob_month, year: dob_year },
  //         relationship: { representative: true, title: "Director", percent_ownership: 100 },
  //         address: {
  //           line1: addressLine1,
  //           city,
  //           state: province,
  //           postal_code,
  //           country: country.toUpperCase(),
  //         },
  //       };

  //       if (ssn && ssn.trim() !== "") {
  //         personData.ssn_last_4 = ssn.slice(-4);
  //       } else if (itin && itin.trim() !== "") {
  //         personData.id_number = itin.trim();
  //       }

  //       representative = await stripe.accounts.createPerson(account.id, personData);
  //     } catch (personError: any) {
  //       console.error("❌ Stripe Person Creation Error:", personError);
  //       const message =
  //         (personError.raw && personError.raw.message) ||
  //         personError.message ||
  //         "Invalid representative details.";
  //       res.status(400).json({ success: false, message });
  //       return;
  //     }

  //     // ✅ 5. Verify account requirements (polling up to 30s)
  //     let accountDetails;
  //     let missing = [] as any;
  //     let NGOAccountReady = false;

  //     for (let attempt = 0; attempt < 5; attempt++) {
  //       await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6s each time

  //       accountDetails = await stripe.accounts.retrieve(account.id);
  //       missing = accountDetails.requirements?.currently_due || [];

  //       const chargesEnabled = accountDetails.charges_enabled;
  //       const payoutsEnabled = accountDetails.payouts_enabled;

  //       if (chargesEnabled && payoutsEnabled && missing.length === 0) {
  //         NGOAccountReady = true;
  //         break;
  //       }

  //       console.log(`⏳ Waiting for Stripe verification... attempt ${attempt + 1}/5`);
  //     }

  //     const isTest = process.env.NODE_ENV == "sandbox";

  //     if (!NGOAccountReady) {
  //       // In test mode, do NOT delete the account — allow saving for dev/testing
  //       if (!isTest) {
  //         try {
  //           await stripe.accounts.del(account.id);
  //         } catch (delErr) {
  //           console.error("Failed to delete incomplete account:", delErr);
  //         }
  //          res.status(400).json({
  //           success: false,
  //           message: "Stripe still requires verification (SSN/ITIN or company info). Please review and resubmit.",
  //           missingFields: missing,
  //         });
  //         return
  //       } else {
  //         // test mode: consider account ready for local dev
  //         NGOAccountReady = true;
  //       }
  //     }


  //     // ✅ 6. Save verified details
  //     ngo.bankDetails = {
  //       registration_number,
  //       preferredCurrency,
  //       accountHolderName,
  //       accountNumber,
  //       routing_number,
  //       addressLine1,
  //       city,
  //       province,
  //       postal_code,
  //       ssn,
  //       itin,
  //       ein,
  //       representative: {
  //         firstName,
  //         lastName,
  //         dob: { day: dob_day, month: dob_month, year: dob_year },
  //       },
  //     };

  //     ngo.stripeAccountId = account.id;
  //     ngo.stripeRepresentativeId = representative.id;
  //     ngo.NGOAccountReady = NGOAccountReady;
  //     await ngo.save();

  //     console.log("✅ Stripe account successfully created and verified for NGO:", ngo.orgName);

  //     res.status(200).json({
  //       success: true,
  //       message: "🎉 NGO Information and Stripe account created Successfully!",
  //       stripeAccountId: ngo.stripeAccountId,
  //       stripeRepresentativeId: ngo.stripeRepresentativeId,
  //       NGOAccountReady,
  //       missingFields: missing,
  //     });
  //   } catch (error: any) {
  //     console.error("❌ Fatal Stripe account creation error:", error);
  //     const message =
  //       error?.raw?.message || error.message || "Unexpected server error during Stripe setup.";
  //     res.status(500).json({ success: false, message });
  //   }
  // },

  // completeBankDetails: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const ngoId = req.user?.id;
  //     // const {ngoId} = req.params;

  //     if (!ngoId) {
  //       res.status(400).json({ success: false, message: "NGO ID is required" });
  //       return;
  //     }

  //     const {
  //       registration_number,
  //       preferredCurrency,
  //       accountHolderName,
  //       accountNumber,
  //       routing_number,
  //       addressLine1,
  //       country,
  //       city,
  //       province,
  //       postal_code,
  //       firstName,
  //       lastName,
  //       dob_day,
  //       dob_month,
  //       dob_year,
  //     } = req.body;

  //     // REQUIRED FIELDS
  //     const required = {
  //       accountHolderName,
  //       accountNumber,
  //       addressLine1,
  //       city,
  //       postal_code,
  //       firstName,
  //       lastName,
  //       dob_day,
  //       dob_month,
  //       dob_year,
  //       country,
  //       preferredCurrency,
  //     };

  //     for (let [key, value] of Object.entries(required)) {
  //       if (!value) {
  //         res.status(400).json({
  //           success: false,
  //           message: `Missing required field: ${key}`,
  //         });
  //         return;
  //       }
  //     }

  //     const ngo = await Ngo.findById(ngoId);
  //     if (!ngo) {
  //       res.status(404).json({ success: false, message: "NGO not found" });
  //       return;
  //     }

  //     if (!ngo.profileComplete) {
  //       res.status(400).json({ success: false, message: "NGO profile is incomplete" });
  //       return;
  //     }

  //     // SAVE FORM DATA FIRST
  //     ngo.bankDetails = {
  //       registration_number,
  //       preferredCurrency,
  //       accountHolderName,
  //       accountNumber,
  //       routing_number,
  //       addressLine1,
  //       city,
  //       province,
  //       postal_code,
  //       representative: {
  //         firstName,
  //         lastName,
  //         dob: { day: dob_day, month: dob_month, year: dob_year },
  //       },
  //     };

  //     await ngo.save();

  //     // CHECK COUNTRY IS VALID IN STRIPE
  //     try {
  //       await stripe.countrySpecs.retrieve(country.toUpperCase());
  //     } catch {
  //       res.status(400).json({
  //         success: false,
  //         message: `${country} is not supported by Stripe.`,
  //       });
  //       return;
  //     }

  //     // ZA Routing validation (Optional)
  //     if (country.toUpperCase() === "ZA") {
  //       if (!routing_number) {
  //         res.status(400).json({ success: false, message: "Routing number required for ZA" });
  //         return;
  //       }
  //     }

  //     // CREATE / UPDATE STRIPE ACCOUNT
  //     let accountId = ngo.stripeAccountId;
  //     let account;

  //     if (!accountId) {
  //       try {
  //         account = await stripe.accounts.create({
  //           type: "custom",
  //           country: country,
  //           email: ngo.officialEmail,
  //           business_type: "company",

  //           capabilities: {
  //             transfers: { requested: true },
  //             card_payments: { requested: true },
  //           },

  //           external_account: {
  //             object: "bank_account",
  //             country,
  //             currency: preferredCurrency,
  //             account_holder_name: accountHolderName,
  //             account_number: accountNumber,
  //             routing_number: routing_number || undefined,
  //           },

  //           tos_acceptance: {
  //           date: Math.floor(Date.now() / 1000),  // 🔥 FIXED
  //           ip: req.ip || "127.0.0.1",
  //           },
  //         });
  //       } catch (err: any) {
  //         res.status(200).json({
  //           success: false,
  //           accountCreated: false,
  //           message: err?.raw?.message || "Invalid bank details.",
  //         });
  //         return;
  //       }

  //       ngo.stripeAccountId = account.id;
  //       await ngo.save();
  //     } else {
  //       try {
  //         account = await stripe.accounts.update(accountId, {
  //           external_account: {
  //             object: "bank_account",
  //             country,
  //             currency: preferredCurrency,
  //             account_holder_name: accountHolderName,
  //             account_number: accountNumber,
  //             routing_number: routing_number || undefined,
  //           },
  //         });
  //       } catch (err: any) {
  //         res.status(200).json({
  //           success: false,
  //           accountCreated: false,
  //           message: err?.raw?.message || "Stripe update error.",
  //         });
  //         return;
  //       }
  //     }

  //     // COMPANY INFO (NO TAX ID IN AFRICA)
  //     try {
  //       await stripe.accounts.update(account.id, {
  //         company: {
  //           name: ngo.orgName,
  //           address: {
  //             line1: addressLine1,
  //             city,
  //             state: province,
  //             postal_code,
  //             country,
  //           },
  //         },
  //       });
  //     } catch { }

  //     // CREATE / UPDATE PERSON
  //     try {
  //       const personData: any = {
  //         first_name: firstName,
  //         last_name: lastName,
  //         dob: { day: dob_day, month: dob_month, year: dob_year },
  //         relationship: { representative: true, title: "Director", percent_ownership: 100 },
  //         address: { line1: addressLine1, city, state: province, postal_code, country },
  //       };

  //       let person;
  //       if (!ngo.stripeRepresentativeId) {
  //         person = await stripe.accounts.createPerson(account.id, personData);
  //         ngo.stripeRepresentativeId = person.id;
  //         await ngo.save();
  //       } else {
  //         person = await stripe.accounts.updatePerson(account.id, ngo.stripeRepresentativeId, personData);
  //       }
  //     } catch {
  //       res.status(200).json({
  //         success: false,
  //         accountCreated: false,
  //         message: "Invalid representative details.",
  //       });
  //       return;
  //     }

  //     // CHECK VERIFICATION STATUS
  //     const details = await stripe.accounts.retrieve(account.id);
  //     const missing = details.requirements?.currently_due || [];

  //     const isReady =
  //       details.charges_enabled &&
  //       details.payouts_enabled &&
  //       missing.length === 0;

  //     ngo.NGOAccountReady = isReady;
  //     await ngo.save();

  //     if (!isReady) {
  //       res.status(200).json({
  //         success: false,
  //         accountCreated: true,
  //         message: "Stripe still needs verification.",
  //         missingFields: missing,
  //       });
  //       return;
  //     }

  //     res.status(200).json({
  //       success: true,
  //       message: "Stripe account successfully verified!",
  //       stripeAccountId: account.id,
  //       missingFields: [],
  //     });
  //   } catch (err: any) {
  //     res.status(500).json({
  //       success: false,
  //       message: err.message || "Server error",
  //     });
  //   }
  // },

  completeBankDetails: async (req: Request, res: Response): Promise<void> => {
    try {
      const ngoId = req.user?.id;
      if (!ngoId) {
        res.status(400).json({ success: false, message: "NGO ID is required" });
        return;
      }

      // Extract data from request body
      const {
        registration_number,
        preferredCurrency,
        accountHolderName,
        accountNumber,
        routing_number,
        addressLine1,
        country,
        city,
        province,
        postal_code,
        ssn,
        itin,
        ein,
        firstName,
        lastName,
        dob_day,
        dob_month,
        dob_year,
      } = req.body;

      // ✅ Required field validation
      const requiredFields = {
        accountHolderName,
        accountNumber,
        addressLine1,
        city,
        postal_code,
        firstName,
        lastName,
        dob_day,
        dob_month,
        dob_year,
        country,
        preferredCurrency,
      };

      for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
          res.status(400).json({
            success: false,
            message: `Missing required field: ${key}`,
          });
          return;
        }
      }

      const ngo = await Ngo.findById(ngoId);
      if (!ngo) {
        res.status(404).json({ success: false, message: "NGO not found" });
        return;
      }

      if (!ngo.profileComplete) {
        res.status(400).json({ success: false, message: "NGO profile is incomplete" });
        return;
      }

      // ✅ 1. Check if country is supported by Stripe
      try {
        await stripe.countrySpecs.retrieve(country.toUpperCase());
      } catch (err) {
        res.status(400).json({
          success: false,
          message: `Stripe does not currently support payouts in ${country}. Please choose a supported country.`,
        });
        return;
      }

      // ✅ 1.1 Validate SSN / ITIN for U.S. accounts
      if (country.toUpperCase() === "US") {
        if ((!ssn || ssn.trim() === "") && (!itin || itin.trim() === "")) {
          res.status(400).json({
            success: false,
            message:
              "For U.S. accounts, either SSN (last 4 digits) or ITIN is required to verify identity.",
          });
          return;
        }

        if (ssn && !/^\d{4}$/.test(ssn.trim())) {
          res.status(400).json({
            success: false,
            message: "Invalid SSN format. Provide the last 4 digits only.",
          });
          return;
        }

        if (itin && !/^9\d{8}$/.test(itin.trim())) {
          res.status(400).json({
            success: false,
            message:
              "Invalid ITIN format. It should be 9 digits starting with 9 (e.g. 900700000).",
          });
          return;
        }
      }

      if (country === "ZA" && !/^[A-Z]{4}ZA[A-Z]{2,3}$/.test(routing_number)) {
        res.status(400).json({
          success: false,
          message:
            "Invalid South Africa routing number. Use BIC format like ABSAZAJJ or FIRNZAJJ.",
        });
        return;
      }

      // ✅ 2. Create Stripe Account
      let account;
      try {
        account = await stripe.accounts.create({
          type: "custom",
          country: country.toUpperCase(),
          email: ngo.officialEmail,
          business_type: "company",
          business_profile: {
            name: ngo.orgName,
            url: ngo.website || "https://example.org",
            product_description: ngo.description || "Non-profit organization",
            mcc: "8398",
            support_phone: ngo.phoneNumber?.trim() || "+12025550123",
          },
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          external_account: {
            object: "bank_account",
            country: country.toUpperCase(),
            currency: preferredCurrency.toLowerCase(),
            account_holder_name: accountHolderName,
            account_number: accountNumber,
            routing_number: routing_number || undefined,
          },
          tos_acceptance: {
            date: Math.floor(Date.now() / 1000),
            ip: req.ip || "127.0.0.1",
          },
        });
      } catch (stripeError: any) {
        console.error("❌ Stripe Account Create Error:", stripeError);
        const message = stripeError?.raw?.message || "Invalid bank or country details.";
        res.status(400).json({ success: false, message });
        return;
      }

      // ✅ 3. Add organization info
      try {
        await stripe.accounts.update(account.id, {
          company: {
            name: ngo.orgName,
            phone: ngo.phoneNumber?.trim() || "+12025550123",
            tax_id: ein || undefined,
            address: {
              line1: addressLine1,
              city,
              state: province,
              postal_code,
              country: country.toUpperCase(),
            },
          },
        });
      } catch (updateError: any) {
        console.error("❌ Stripe Account Update Error:", updateError);
        const message = updateError?.raw?.message || "Invalid organization information.";
        res.status(400).json({ success: false, message });
        return;
      }

      // ✅ 4. Create representative (person)
      let representative;
      try {
        const personData: any = {
          first_name: firstName,
          last_name: lastName,
          email: ngo.officialEmail,
          phone: ngo.phoneNumber || "+12025550123",
          ssn_last_4: process.env.NODE_ENV === "production" ? ssn?.slice(-4) : "0000",
          dob: { day: dob_day, month: dob_month, year: dob_year },
          relationship: { representative: true, title: "Director", percent_ownership: 100 },
          address: {
            line1: addressLine1,
            city,
            state: province,
            postal_code,
            country: country.toUpperCase(),
          },
        };

        if (ssn && ssn.trim() !== "") {
          personData.ssn_last_4 = ssn.slice(-4);
        } else if (itin && itin.trim() !== "") {
          personData.id_number = itin.trim();
        }

        representative = await stripe.accounts.createPerson(account.id, personData);
      } catch (personError: any) {
        console.error("❌ Stripe Person Creation Error:", personError);
        const message =
          (personError.raw && personError.raw.message) ||
          personError.message ||
          "Invalid representative details.";
        res.status(400).json({ success: false, message });
        return;
      }

      // ✅ 5. Upload documents from DB to Stripe
      const uploadedFiles: Record<string, string> = {};

      const documentMap = [
        { type: "leadershipProof", purpose: "identity_document" },
        { type: "registrationCertificate", purpose: "business_license" },
      ];

      for (const doc of documentMap) {
        const documentPath = ngo.documents?.[doc.type as keyof typeof ngo.documents];
        if (documentPath && fs.existsSync(documentPath)) {
          try {
            const stripeFile = await stripe.files.create({
              // purpose: doc.purpose,
              purpose: doc.purpose as Stripe.FileCreateParams.Purpose,
              file: {
                data: fs.readFileSync(documentPath),
                name: path.basename(documentPath),
                type: "application/pdf",
              },
            });
            uploadedFiles[doc.type] = stripeFile.id;
          } catch (fileErr) {
            console.error(`❌ Stripe File Upload Error (${doc.type}):`, fileErr);
          }
        }
      }

      // ✅ 6. Attach documents to Stripe account
      try {
        await stripe.accounts.update(account.id, {
          company: {
            verification: {
              document: {
                front: uploadedFiles["registrationCertificate"] || undefined,
              },
            },
          },
        });

        if (uploadedFiles["leadershipProof"]) {
          await stripe.accounts.updatePerson(account.id, representative.id, {
            verification: {
              document: {
                front: uploadedFiles["leadershipProof"],
              },
            },
          });
        }
      } catch (attachErr) {
        console.error("❌ Stripe Document Attach Error:", attachErr);
      }

      // ✅ 7. Verify account requirements (polling up to 30s)
      let accountDetails;
      let missing = [] as any;
      let NGOAccountReady = false;

      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 6000));

        accountDetails = await stripe.accounts.retrieve(account.id);
        missing = accountDetails.requirements?.currently_due || [];

        const chargesEnabled = accountDetails.charges_enabled;
        const payoutsEnabled = accountDetails.payouts_enabled;

        if (chargesEnabled && payoutsEnabled && missing.length === 0) {
          NGOAccountReady = true;
          break;
        }

        console.log(`⏳ Waiting for Stripe verification... attempt ${attempt + 1}/5`);
      }

      const isTest = process.env.NODE_ENV == "sandbox";

      if (!NGOAccountReady && !isTest) {
        try {
          await stripe.accounts.del(account.id);
        } catch (delErr) {
          console.error("Failed to delete incomplete account:", delErr);
        }
        res.status(400).json({
          success: false,
          message:
            "Stripe still requires verification (SSN/ITIN or company info). Please review and resubmit.",
          missingFields: missing,
        });
        return;
      }

      // ✅ 8. Save verified details
      ngo.bankDetails = {
        registration_number,
        preferredCurrency,
        accountHolderName,
        accountNumber,
        routing_number,
        addressLine1,
        city,
        province,
        postal_code,
        ssn,
        itin,
        ein,
        representative: {
          firstName,
          lastName,
          dob: { day: dob_day, month: dob_month, year: dob_year },
        },
      };

      ngo.stripeAccountId = account.id;
      ngo.stripeRepresentativeId = representative.id;
      ngo.NGOAccountReady = NGOAccountReady;
      await ngo.save();

      console.log("✅ Stripe account successfully created and verified for NGO:", ngo.orgName);

      res.status(200).json({
        success: true,
        message: "🎉 NGO Information, Stripe account, and documents uploaded successfully!",
        stripeAccountId: ngo.stripeAccountId,
        stripeRepresentativeId: ngo.stripeRepresentativeId,
        NGOAccountReady,
        missingFields: missing,
      });
    } catch (error: any) {
      console.error("❌ Fatal Stripe account creation error:", error);
      const message =
        error?.raw?.message || error.message || "Unexpected server error during Stripe setup.";
      res.status(500).json({ success: false, message });
    }
  },

  startOnboarding: async (req: Request, res: Response): Promise<void> => {
    try {
      const ngoId = req.user?.id;
      if (!ngoId) {
        res.status(400).json({ success: false, message: "NGO ID is required" });
        return;
      }

      const ngo = await Ngo.findById(ngoId);
      if (!ngo) {
        res.status(404).json({ success: false, message: "NGO not found" });
        return;
      }

      // if (!ngo.profileComplete) {
      //   res
      //     .status(400)
      //     .json({ success: false, message: "NGO profile is incomplete" });
      //   return;
      // }

      const country =
        ngo.country?.toUpperCase() ||
        "US";

      let stripeAccountId = ngo.stripeAccountId;

      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country,
          email: ngo.officialEmail,
          // business_type: "company",
          // business_profile: {
          //   name: ngo.orgName,
          //   url: ngo.website || undefined,
          //   product_description:
          //     ngo.description || "Non-profit organization on our platform",
          //   mcc: "8398", // Non-profit
          // },
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          metadata: {
            ngoId: ngo._id.toString(),
          },
        });

        console.log(account, "new stripe account created...");

        stripeAccountId = account.id;
        ngo.stripeAccountId = account.id;
        ngo.NGOAccountReady = false;
        await ngo.save();
      }

      const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        type: "account_onboarding",
        refresh_url: `${API_BASE_URL}/stripe/onboarding/refresh?accountId=${stripeAccountId}`,
        return_url: `${process.env.FRONTEND_URL}/stripe/onboarding/return?accountId=${stripeAccountId}`,
      });

      res.status(200).json({
        success: true,
        url: accountLink.url,
        stripeAccountId,
      });
    } catch (error: any) {
      console.error("❌ startOnboarding error:", error);
      res.status(500).json({
        success: false,
        message:
          error?.raw?.message ||
          error?.message ||
          "Unexpected server error starting Stripe onboarding.",
      });
    }
  },

  refreshOnboarding: async (req: Request, res: Response): Promise<void> => {
    try {
      const accountId = req.query.accountId as string | undefined;

      if (!accountId) {
        res.status(400).send("Missing accountId");
        return;
      }

      // Optional: verify karein ke yeh accountId kisi NGO ka hi hai
      const ngo = await Ngo.findOne({ stripeAccountId: accountId });
      if (!ngo) {
        res.status(404).send("Unknown Stripe account");
        return;
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        refresh_url: `${process.env.API_BASE_URL}/stripe/onboarding/refresh?accountId=${accountId}`,
        return_url: `${process.env.FRONTEND_URL}/stripe/onboarding/return?accountId=${accountId}`,
      });

      // 303 redirect recommended by Stripe
      res.redirect(303, accountLink.url);
    } catch (error: any) {
      console.error("❌ refreshOnboarding error:", error);
      // Yahan par simple error message show kar sakte hain
      res.status(500).send("Failed to refresh Stripe onboarding link.");
    }
  },

  getAccountStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const ngoId = req.user?.id;
      if (!ngoId) {
        res.status(400).json({ success: false, message: "NGO ID is required" });
        return;
      }

      const ngo = await Ngo.findById(ngoId);
      if (!ngo || !ngo.stripeAccountId) {
        res.status(404).json({
          success: false,
          message: "Stripe account not found for this NGO",
        });
        return;
      }

      const account = await stripe.accounts.retrieve(ngo.stripeAccountId);

      const missing = account.requirements?.currently_due || [];
      const chargesEnabled = account.charges_enabled;
      const payoutsEnabled = account.payouts_enabled;
      const detailsSubmitted = (account as any).details_submitted ?? false;

      // Aap ka purana logic roughly yehi tha:
      const NGOAccountReady =
        chargesEnabled && payoutsEnabled && missing.length === 0;

      ngo.NGOAccountReady = NGOAccountReady;
      await ngo.save();

      res.status(200).json({
        success: true,
        NGOAccountReady,
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        missingFields: missing,
      });
    } catch (error: any) {
      console.error("❌ getAccountStatus error:", error);
      res.status(500).json({
        success: false,
        message:
          error?.raw?.message ||
          error?.message ||
          "Unexpected server error while checking Stripe account status.",
      });
    }
  },

  approveNgo: async (req: Request, res: Response): Promise<void> => {
    try {
      const { ngoId } = req.params;
      if (!ngoId) {
        res.status(400).json({ message: "NGO ID is required" });
        return
      }

      const ngo = await Ngo.findById(ngoId);
      if (!ngo) {
        res.status(404).json({ message: "NGO not found" });
        return
      };

      // if (!ngo.profileComplete) {
      //   res.status(400).json({ message: "NGO profile is not complete yet" });
      //   return
      // }

      // // ✅ Step 1: Validate EIN / SSN
      // const ein = ngo.bankDetails?.ein?.replace(/[^0-9]/g, "");
      // if (!ein || ein.length !== 9) {
      //   res.status(400).json({ message: "Invalid EIN format — must be 9 numeric digits only" });
      //   return
      // }

      // console.log(ein, "ein tax_id.....");
      // console.log(ngo?.phoneNumber, "phone nuymber add.....")

      // const ssnLast4 = ngo.bankDetails?.ssnLast4?.replace(/[^0-9]/g, "");
      // if (ssnLast4 && ssnLast4.length !== 4) {
      //   res.status(400).json({ message: "Invalid SSN last 4 digits — must be 4 numbers" });
      //   return
      // }

      // // ✅ Step 2: Pre-validate required fields for Stripe
      // const requiredFields = [
      //   ngo.orgName,
      //   ngo.officialEmail,
      //   ngo.bankDetails?.accountHolderName,
      //   ngo.bankDetails?.accountNumber,
      //   ngo.bankDetails?.routing_number,
      //   ngo.bankDetails?.addressLine1,
      //   ngo.bankDetails?.city,
      //   ngo.bankDetails?.province,
      //   ngo.bankDetails?.postal_code,
      // ];

      // if (requiredFields.some(f => !f)) {
      //   res.status(400).json({ message: "Missing required NGO or bank details" });
      //   return
      // }

      // // ✅ Step 3: Create Stripe Custom Account
      // const account = await stripe.accounts.create({
      //   type: "custom",
      //   country: ngo.country || "US",
      //   email: ngo.officialEmail,
      //   business_type: "company",
      //   business_profile: {
      //     name: ngo.orgName,
      //     url: ngo.website || "https://example.org",
      //     product_description: ngo.description || "Non-profit organization",
      //     mcc: "8398",
      //     support_phone: ngo.phoneNumber?.trim() || "+12025550123",
      //   },
      //   external_account: {
      //     object: "bank_account",
      //     country: ngo.country || "US",
      //     currency: (ngo.bankDetails?.preferredCurrency || "usd").toLowerCase(),
      //     account_holder_name: ngo?.bankDetails?.accountHolderName || "",
      //     account_number: ngo?.bankDetails?.accountNumber || "",
      //     routing_number: ngo?.bankDetails?.routing_number || "",
      //   },
      //   capabilities: {
      //     card_payments: { requested: true },
      //     transfers: { requested: true },
      //   },
      //   tos_acceptance: {
      //     date: Math.floor(Date.now() / 1000),
      //     ip: req.ip || "127.0.0.1",
      //   },
      // });

      // console.log(account, "account dataaa...")

      // await new Promise(resolve => setTimeout(resolve, 1500));

      // await stripe.accounts.update(account.id, {
      //   company: {
      //     phone: ngo?.phoneNumber?.trim() || "+12025550123",
      //     tax_id: "000000000",
      //     address: {
      //       line1: ngo?.bankDetails?.addressLine1 || "",
      //       city: ngo?.bankDetails?.city || "",
      //       state: ngo?.bankDetails?.province || "",
      //       postal_code: ngo?.bankDetails?.postal_code || "",
      //       country: ngo.country || "US",
      //     },
      //     name: ngo.orgName,
      //   },
      // });

      // // ✅ Step 4: Create Representative
      // const representative = await stripe.accounts.createPerson(account.id, {
      //   first_name: ngo.bankDetails?.firstName || "John",
      //   last_name: ngo.bankDetails?.lastName || "Doe",
      //   email: ngo.officialEmail,
      //   phone: ngo.phoneNumber || "+12025550123",
      //   ssn_last_4: ssnLast4 || "0000",
      //   dob: {
      //     day: ngo.bankDetails?.dob_day || 1,
      //     month: ngo.bankDetails?.dob_month || 1,
      //     year: ngo.bankDetails?.dob_year || 1980,
      //   },
      //   relationship: { representative: true, title: "Director", percent_ownership: 100 },
      //   address: {
      //     line1: ngo?.bankDetails?.addressLine1 || "",
      //     city: ngo?.bankDetails?.city || "",
      //     state: ngo?.bankDetails?.province || "",
      //     postal_code: ngo?.bankDetails?.postal_code || "",
      //     country: ngo.country || "US",
      //   },

      // });

      // // ✅ Step 5: Dynamic check for missing required info
      // const accountDetails = await stripe.accounts.retrieve(account.id);
      // const missingFields = accountDetails.requirements?.currently_due || [];
      // if (missingFields.length) {
      //   res.status(400).json({
      //     message: "Stripe requires additional info:", missingFields
      //   });
      //   return
      // }


      // ✅ Step 6: Save NGO with Stripe info
      ngo.status = "approved";
      // ngo.stripeAccountId = account.id;
      // ngo.stripeRepresentativeId = representative.id;
      await ngo.save();

      res.status(200).json({
        message: "NGO approved and Stripe account created successfully",
        ngo: {
          id: ngo._id,
          name: ngo.name,
          email: ngo.email,
          status: ngo.status,
          // stripeAccountId: ngo.stripeAccountId,
          // stripeRepresentativeId: ngo.stripeRepresentativeId,
        },
      });
    } catch (error: any) {
      console.error("Error creating Stripe account:", error);
      res.status(500).json({ message: "Error approving NGO or creating Stripe account", error: error.message });
    }
  },

  //  approveNgo: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const { ngoId } = req.params;
  //     if (!ngoId) return void res.status(400).json({ message: "NGO ID required" });

  //     const ngo = (await Ngo.findById(ngoId)) as INgoDocument | null;
  //     if (!ngo) return void res.status(404).json({ message: "NGO not found" });
  //     if (!ngo.profileComplete) {
  //       return void res.status(400).json({ message: "NGO profile is not complete yet" });
  //     }

  //     // Country must be Africa-only
  //     const rawCountry = (ngo.country || "").toUpperCase();
  //     if (!AFRICA_ALLOWED.has(rawCountry)) {
  //       return void res.status(400).json({
  //         message: "Currently supported countries: NG, KE, EG",
  //         detail: `Received country=${rawCountry || "N/A"}`,
  //       });
  //     }

  //     // Validate Stripe support
  //     try {
  //       await stripe.countrySpecs.retrieve(rawCountry);
  //     } catch {
  //       return void res.status(400).json({ message: `Stripe does not support ${rawCountry} for Connect` });
  //     }

  //     // If account already exists → update, don't create again
  //     if (ngo.stripeAccountId) {
  //       const existing = await stripe.accounts.retrieve(ngo.stripeAccountId).catch(() => null);
  //       if (existing && !(existing as any).deleted) {
  //         // If country mismatch, delete old and proceed to create new
  //         if ((existing as Stripe.Account).country !== rawCountry) {
  //           await stripe.accounts.del(ngo.stripeAccountId);
  //           ngo.stripeAccountId = undefined as any;
  //           await ngo.save();
  //         } else {
  //           // Update capabilities (avoid transfers-only error)
  //           await stripe.accounts.update(ngo.stripeAccountId, {
  //             capabilities: {
  //               transfers: { requested: true },
  //               card_payments: { requested: true },
  //             },
  //           });
  //           // Start onboarding session
  //           const session = await stripe.accountSessions.create({
  //             account: ngo.stripeAccountId,
  //             components: { account_onboarding: { enabled: true } },
  //           });
  //           return void res.status(200).json({
  //             message: "Existing Stripe account updated",
  //             ngo: { id: ngo._id, name: ngo.name, email: ngo.email, status: ngo.status, stripeAccountId: ngo.stripeAccountId },
  //             onboarding: { client_secret: session.client_secret },
  //           });
  //         }
  //       }
  //     }

  //     // Optional: upload registration doc (correct purpose)
  //     let registrationFileId: string | undefined;
  //     const regField =
  //       ngo.documents?.registrationCertificate ||
  //       (ngo as any).documents?.registrationCertificateLocal;

  //     if (regField && typeof regField === "string") {
  //       if (regField.startsWith("file_")) {
  //         registrationFileId = regField;
  //       } else if (fs.existsSync(regField)) {
  //         const buffer = fs.readFileSync(regField);
  //         const uploaded = await stripe.files.create({
  //           purpose: "additional_verification",
  //           file: { data: buffer, name: path.basename(regField), type: "application/pdf" },
  //         } as any);
  //         registrationFileId = uploaded.id;
  //         ngo.documents = ngo.documents || {};
  //         (ngo.documents as any).registrationCertificate = uploaded.id;
  //         await ngo.save();
  //       }
  //     }

  //     // Create new Custom account (no external_account here)
  //     const accountParams: Stripe.AccountCreateParams = {
  //   type: "custom",
  //   country: "NG", // must match NGO country
  //   email: ngo.officialEmail || ngo.email,
  //   business_type: "company",
  //   capabilities: {
  //     transfers: { requested: true },
  //     card_payments: { requested: true },
  //   },
  //   business_profile: {
  //     name: ngo.orgName || ngo.name,
  //     url: ngo.website || "https://example.org",
  //     product_description: ngo.description || "Non-profit organization",
  //     mcc: "8398",
  //     support_phone: ngo.phoneNumber || "+0000000000",
  //   },
  //   company: {
  //     name: ngo.orgName || ngo.name,
  //     phone: ngo.phoneNumber || "+0000000000",
  //     address: {
  //       line1: ngo.bankDetails?.addressLine1 || "1 Test Street",
  //       city: ngo.bankDetails?.city || "Lagos",
  //       state: ngo.bankDetails?.province || "Lagos",
  //       postal_code: ngo.bankDetails?.postal_code || "100001",
  //       country: "NG",
  //     },
  //     ...(registrationFileId ? { verification: { document: { front: registrationFileId } } } : {}),
  //   },
  //   external_account: {
  //     object: "bank_account",
  //     country: "NG",
  //     currency: "ngn", // must match local currency
  //     account_holder_name: ngo.bankDetails?.accountHolderName || ngo.orgName || ngo.name,
  //     account_number: "0001234567", // valid NG account number for testing
  //     routing_number: "044000149", // must match NG format: AAAANGBB or AAAANGBBXYZ
  //   },
  //   tos_acceptance: {
  //     date: Math.floor(Date.now() / 1000),
  //     ip: req.ip || "127.0.0.1",
  //   },
  // };


  //     // Use a fresh idempotency key (previous key reuse causes StripeIdempotencyError)
  //     const account = await stripe.accounts.create(accountParams, {
  //       idempotencyKey: `approveNgo:create:${ngo._id}:${rawCountry}:${randomUUID()}`,
  //     });

  //     ngo.stripeAccountId = account.id;
  //     ngo.status = "approved";
  //     await ngo.save();

  //     // If you want to set TOS now (optional), do it in a separate stable call:
  //     // await stripe.accounts.update(account.id, {
  //     //   tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: req.ip || "127.0.0.1", service_agreement: "recipient" }
  //     // });

  //     // Start Embedded Onboarding (collect KYC + bank)
  //     const session = await stripe.accountSessions.create({
  //       account: account.id,
  //       components: { account_onboarding: { enabled: true } },
  //     });

  //     res.status(200).json({
  //       message: "NGO approved. Custom connected account created for Africa.",
  //       ngo: {
  //         id: ngo._id,
  //         name: ngo.name,
  //         email: ngo.email,
  //         status: ngo.status,
  //         stripeAccountId: ngo.stripeAccountId,
  //       },
  //       onboarding: { client_secret: session.client_secret },
  //     });
  //   } catch (err: any) {
  //     console.error("Error creating Stripe account:", {
  //       type: err?.type,
  //       code: err?.code,
  //       param: err?.param,
  //       message: err?.message,
  //       requestId: err?.requestId,
  //     });
  //     res.status(500).json({
  //       message: "Error approving NGO or creating Stripe account",
  //       error: err?.message || String(err),
  //       param: err?.param,
  //       code: err?.code,
  //     });
  //   }
  // },

  // Admin: Reject NGO


  rejectNgo: async (req: Request, res: Response): Promise<void> => {
    try {
      const { ngoId } = req.params;

      const ngo = await Ngo.findByIdAndUpdate(
        ngoId,
        { status: "rejected" },
        { new: true }
      );

      if (!ngo) {
        res.status(404).json({ message: "NGO not found" });
        return;
      }

      // Send rejection email
      await emailService.sendApprovalEmail(ngo.email, ngo.name, false);

      res.json({
        message: "NGO rejected",
        ngo: {
          id: ngo._id,
          name: ngo.name,
          email: ngo.email,
          status: ngo.status,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Error rejecting NGO", error });
    }
  },

  // Login
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const ngo = await Ngo.findOne({ email });
      if (!ngo) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Compare plain text password with stored hash
      const isMatch = await bcrypt.compare(password, ngo.password);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const token = jwt.sign({ userId: ngo._id }, JWT_SECRET, {
        expiresIn: "24h",
      });

      res.json({
        token,
        ngo: {
          id: ngo._id,
          name: ngo.name,
          email: ngo.email,
          status: ngo.status,
          profileComplete: ngo.profileComplete,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Error logging in", error });
    }
  },

  // Get NGO profile with complete details and all campaigns
  getProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const ngoId = req.user?.id;

      // Get the NGO's basic info
      const ngo = await Ngo.findById(ngoId).select("-password");
      if (!ngo) {
        res.status(404).json({ message: "NGO not found" });
        return;
      }

      // Get all campaigns created by this NGO with all details
      const campaigns = await Campaign.find({ ngoId }).sort({ createdAt: -1 });

      // Calculate summary stats
      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(
        (c) => c.status === "ongoing"
      ).length;
      const totalRaised = campaigns.reduce(
        (sum, campaign) => sum + campaign.totalRaised,
        0
      );

      // Analyze campaign success rates and other metrics
      const completedCampaigns = campaigns.filter(
        (c) => c.status === "completed"
      );
      const completionRate =
        totalCampaigns > 0 ? completedCampaigns.length / totalCampaigns : 0;

      // Count total donors (may contain duplicates across campaigns)
      const totalDonations = campaigns.reduce(
        (sum, campaign) => sum + campaign.donations.length,
        0
      );

      // Get unique donors (based on email if available, otherwise name)
      const uniqueDonors = new Map();
      campaigns.forEach((campaign) => {
        campaign.donations.forEach((donation) => {
          const donorKey = donation.donorEmail || donation.donorName;
          if (!uniqueDonors.has(donorKey)) {
            uniqueDonors.set(donorKey, {
              name: donation.donorName,
              email: donation.donorEmail,
              totalDonated: 0,
              donationCount: 0,
              lastDonation: donation.timestamp,
            });
          }

          const donor = uniqueDonors.get(donorKey);
          donor.totalDonated += donation.amount;
          donor.donationCount += 1;

          // Update last donation date if newer
          if (new Date(donation.timestamp) > new Date(donor.lastDonation)) {
            donor.lastDonation = donation.timestamp;
          }
        });
      });

      // Return complete profile with all data
      res.json({
        ngo,
        stats: {
          totalCampaigns,
          activeCampaigns,
          completedCampaigns: completedCampaigns.length,
          completionRate,
          totalRaised,
          totalDonations,
          uniqueDonors: uniqueDonors.size,
        },
        campaigns,
        donors: Array.from(uniqueDonors.values()),
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching profile", error });
    }
  },

  // Admin: Get all NGOs
  getAllNgos: async (req: Request, res: Response): Promise<void> => {
    try {
      const { status } = req.query;

      let query = {};
      if (
        status &&
        ["pending", "approved", "rejected"].includes(status as string)
      ) {
        query = { status };
      }

      const ngos = await Ngo.find(query).select("-password");

      res.json(ngos);
    } catch (error) {
      res.status(500).json({ message: "Error fetching NGOs", error });
    }
  },

  // Update () NGO profile
  updateProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const ngoId = req.user?.id;

    const {
      name,
      orgName,
      officialEmail,
      country,
      phoneNumber,
      website,
      description,
      socialLinks,
      bankDetails,
    } = req.body;

    const ngo = await Ngo.findById(ngoId);
    if (!ngo) {
      res.status(404).json({ message: "NGO not found" });
      return;
    }

    const updateData: Record<string, any> = {};

    // -----------------------------
    // Basic Info
    // -----------------------------
    if (name !== undefined) updateData.name = name;
    if (orgName !== undefined) updateData.orgName = orgName;
    if (officialEmail !== undefined) updateData.officialEmail = officialEmail;
    if (country !== undefined) updateData.country = country;
    if (phoneNumber !== undefined) updateData.contactPhone  = phoneNumber;
    if (website !== undefined) updateData.website = website;
    if (description !== undefined) updateData.missionStatement = description;

    // -----------------------------
    // ✅ Social Links (single field)
    // -----------------------------
    if (socialLinks !== undefined) {
      updateData.socialLinks = socialLinks;
    }

    // -----------------------------
    // Bank Details (safe merge)
    // -----------------------------
    if (bankDetails) {
      updateData.bankDetails = {
        ...ngo.bankDetails, // keep existing values
        ...bankDetails,     // overwrite provided ones
      };
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: "No fields to update provided" });
      return;
    }

    const updatedNgo = await Ngo.findByIdAndUpdate(
      ngoId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!updatedNgo) {
      res.status(404).json({ message: "NGO not found" });
      return;
    }

    res.status(200).json({
      message: "Profile updated successfully",
      ngo: {
        id: updatedNgo._id,
        name: updatedNgo.name,
        email: updatedNgo.email,
        orgName: updatedNgo.orgName,
        country: updatedNgo.country,
        phoneNumber: updatedNgo.phoneNumber,
        website: updatedNgo.website,
        description: updatedNgo.description,

        // ✅ unified response
        socialLinks: updatedNgo.socialLinks,

        profileImage: updatedNgo.profileImage,
        status: updatedNgo.status,
        profileComplete: updatedNgo.profileComplete,
        bankDetails: updatedNgo.bankDetails,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating profile",
      error: error instanceof Error ? error.message : String(error),
    });
  }
  },

  // Upload profile image
  uploadProfileImage: async (req: Request, res: Response): Promise<void> => {
    try {
      const ngoId = req.user?.id;

      if (!req.file) {
        res.status(400).json({ message: "No image uploaded" });
        return;
      }

      const profileImage = req.file.path;

      const updatedNgo = await Ngo.findByIdAndUpdate(
        ngoId,
        { profileImage },
        { new: true }
      ).select("-password");

      if (!updatedNgo) {
        res.status(404).json({ message: "NGO not found" });
        return;
      }

      res.json({
        message: "Profile image uploaded successfully",
        profileImage: updatedNgo.profileImage,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error uploading profile image",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  // PAYPAL
  // onboarding link provide
  generatePaypalOnboardingLink: async (
    req: Request<PaypalOnboardingParams>,
    res: Response
  ): Promise<void> => {
    try {
      const { ngoId } = req.params;
      if (!ngoId) {
        res.status(400).json({ message: "NGO ID required" });
        return
      }

      const ngo = await Ngo.findById(ngoId) as INgoDocument;
      if (!ngo) {
        res.status(404).json({ message: "NGO not found" });
        return;
      }

      const paypalSupportedCountries = ["ZA", "EG", "NG", "KE", "MA", "US"];
      if (!paypalSupportedCountries.includes(ngo.country || "")) {
        res.status(400).json({ message: "PayPal not supported in your country" });
        return
      }

      const PAYPAL_BASE_URL = process.env.PAYPAL_MODE === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

      const paypalResponse = await axios.post(
        `${PAYPAL_BASE_URL}/v2/customer/partner-referrals`,
        {
          tracking_id: ngo._id.toString(),
          partner_config_override: {
            partner_logo_url: `${process.env.FRONTEND_URL}/uploads/logo.png` || "Raising Africa",
            return_url: `${process.env.FRONTEND_URL}/ngo/${ngo._id}/paypal-complete`,
            action_renewal_url: `${process.env.FRONTEND_URL}/ngo/${ngo._id}/paypal-refresh`,
          },
          operations: [
            {
              operation: "API_INTEGRATION",
              api_integration_preference: {
                rest_api_integration: {
                  integration_method: "PAYPAL",
                  integration_type: "THIRD_PARTY",
                  third_party_details: {
                    features: ["PAYMENT", "REFUND", "PARTNER_FEE"],
                  },
                },
              },
            },
          ],
          products: ["PPCP"],
          legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
        },
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
            ).toString("base64")}`,
            "Content-Type": "application/json",
          },
        }
      );

      const links = paypalResponse.data.links || [];
      const onboardingLink = links.find((l: any) => l.rel === "action_url")?.href;
      if (!onboardingLink) {
        res.status(500).json({ message: "Failed to generate PayPal onboarding link" });
        return
      }

      ngo.paypalOnboardingLink = onboardingLink;
      ngo.paypalStatus = "pending";
      await ngo.save();

      res.status(200).json({ message: "PayPal onboarding link generated successfully", onboardingLink });
    } catch (error: any) {
      console.error("Error generating PayPal onboarding link:", error.response?.data || error.message);
      res.status(500).json({ message: "Failed to generate PayPal onboarding link", error: error.message });
    }
  },

  // complete onboarding process
  // completeOnboarding: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const { ngoId } = req.params;
  //     const { merchant_id } = req.body;

  //     if (!ngoId || !merchant_id) {
  //       res.status(400).json({ message: "Missing NGO ID or merchant ID" });
  //       return
  //     }

  //     const ngo = await Ngo.findById(ngoId) as INgoDocument;
  //     if (!ngo) {
  //       res.status(404).json({ message: "NGO not found" });
  //       return
  //     }

  //     ngo.paypalStatus = "completed";
  //     ngo.paypalMerchantId = merchant_id;
  //     await ngo.save(); 

  //     res.status(200).json({ message: "PayPal onboarding completed successfully" });
  //   } catch (err: any) {
  //     console.error(err);
  //     res.status(500).json({ message: "Failed to complete PayPal onboarding", error: err.message });
  //   }
  // },

  completeOnboarding: async (req: Request, res: Response): Promise<void> => {
    try {
      const { ngoId } = req.params;
      const { code } = req.body;

      if (!ngoId || !code) {
        res.status(400).json({ message: "Missing NGO ID or code" });
        return
      }

      const ngo = await Ngo.findById(ngoId) as INgoDocument;
      if (!ngo) {
        res.status(404).json({ message: "NGO not found" });
        return
      }

      const PAYPAL_BASE_URL = process.env.PAYPAL_MODE === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

      // 1️⃣ Get OAuth token
      const tokenResp = await axios.post(
        `${PAYPAL_BASE_URL}/v1/oauth2/token`,
        "grant_type=client_credentials",
        {
          auth: {
            username: process.env.PAYPAL_CLIENT_ID!,
            password: process.env.PAYPAL_CLIENT_SECRET!,
          },
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const accessToken = tokenResp.data.access_token;

      // 2️⃣ Exchange code for merchant_id
      const merchantResp = await axios.post(
        `${PAYPAL_BASE_URL}/v1/customer/partners/${process.env.PAYPAL_PARTNER_ID}/merchant-integrations`,
        { code },
        { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
      );

      const merchant_id = merchantResp.data.merchant_id;

      // 3️⃣ Update NGO record
      ngo.paypalStatus = "completed";
      ngo.paypalMerchantId = merchant_id;
      await ngo.save();

      res.status(200).json({ message: "PayPal onboarding completed successfully", merchant_id });
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      res.status(500).json({ message: "Failed to complete PayPal onboarding", error: err.message });
    }
  },

  generatePaypalClientToken: async (req: Request, res: Response): Promise<void> => {
    try {
      const PAYPAL_BASE_URL =
        process.env.PAYPAL_MODE === "live"
          ? "https://api-m.paypal.com"
          : "https://api-m.sandbox.paypal.com";

      // 1Get OAuth access token
      const tokenResp = await axios.post(
        `${PAYPAL_BASE_URL}/v1/oauth2/token`,
        "grant_type=client_credentials",
        {
          auth: {
            username: process.env.PAYPAL_CLIENT_ID!,
            password: process.env.PAYPAL_CLIENT_SECRET!,
          },
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const accessToken = tokenResp.data.access_token;

      const clientTokenResp = await axios.post(
        `${PAYPAL_BASE_URL}/v1/identity/generate-token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const clientToken = clientTokenResp.data.client_token;

      res.status(200).json({
        success: true,
        clientToken,
      });
    } catch (err: any) {
      console.error("PayPal Token Generation Error:", err.response?.data || err.message);
      res.status(500).json({
        success: false,
        message: "Failed to generate PayPal client token",
        error: err.response?.data || err.message,
      });
    }
  },

  // organizations types
  getOrganizationTypesAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationTypes = await OrganizationType.find();
      res.json({
        success: true,
        data: organizationTypes,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error fetching organization types",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // causes types
  getCauseTypesAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const causeTypes = await CauseType.find();
      res.json({
        success: true,
        data: causeTypes,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error fetching cause types",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

}