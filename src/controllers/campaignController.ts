import { Request, Response } from "express";
import mongoose from "mongoose";
import { Campaign, ICampaign } from "../models/Campaign";
import { Ngo } from "../models/Ngo";
import { emailService } from "../utils/emailService";

export const campaignController = {
  // Create a new campaign
  // createCampaign: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const ngoId = req.user?.id;

  //     // Check if NGO has completed profile
  //     const ngo = await Ngo.findById(ngoId);
  //     if (!ngo) {
  //       res.status(403).json({
  //         message: "Complete your NGO profile before creating campaigns",
  //       });
  //       return;
  //     }

  //     const {
  //       title,
  //       description,
  //       fundingGoal,
  //       cause,
  //       country,
  //       deadline,
  //       campaignSlug,
  //       status,
  //     } = req.body;

  //     // let faqs: { question: string; answer: string }[] = [];

  //     // try {
  //     //   if (req.body.faqs) {
  //     //     faqs = typeof req.body.faqs === "string"
  //     //       ? JSON.parse(req.body.faqs)
  //     //       : req.body.faqs;
  //     //   }
  //     // } catch (err) {
  //     //   console.error("FAQ parse error:", err);
  //     //   faqs = [];
  //     // }

  //     // Basic validation
  //     if (!title || !description || !fundingGoal || !cause || !country) {
  //       res.status(400).json({ message: "Missing required campaign fields" });
  //       return;
  //     }

  //     // Media validation
  //     if (!req.files || !("mainImage" in req.files)) {
  //       res.status(400).json({ message: "Main image is required" });
  //       return;
  //     }

  //     // Handle file uploads
  //     const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  //     const media = {
  //       mainImage: files.mainImage?.[0]?.path || "",
  //       additionalImages:
  //         files.additionalImages?.map((file) => file.path) || [],
  //     };

  //     // if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
  //     //   res.status(400).json({ message: "Please provide at least one FAQ" });
  //     //   return;
  //     // }

  //     // let formattedFaqs: { question: string; answer: string }[] = [];
  //     // if (faqs && Array.isArray(faqs)) {
  //     //   formattedFaqs = faqs.filter(
  //     //     (f: any) => f.question?.trim() && f.answer?.trim()
  //     //   );
  //     // }

  //     // Create campaign with the NGO's ID
  //     const campaign = new Campaign({
  //       title,
  //       description,
  //       ngoId,
  //       fundingGoal,
  //       cause,
  //       country,
  //       media,
  //       // faqs: formattedFaqs,
  //       deadline: deadline ? Number(deadline) : null,
  //       status,
  //       // Generate a slug based on title if not provided
  //       campaignSlug:
  //         campaignSlug ||
  //         title
  //           .toLowerCase()
  //           .replace(/[^a-z0-9]+/g, "-")
  //           .replace(/(^-|-$)/g, ""),
  //     });

  //     await campaign.save();

  //     res.status(201).json({
  //       message: "Campaign created successfully",
  //       campaign: {
  //         id: campaign._id,
  //         title: campaign.title,
  //         status: campaign.status,
  //         campaignSlug: campaign.campaignSlug,
  //         // faqs: campaign?.faqs,
  //       },
  //     });
  //   } catch (error) {
  //     res.status(500).json({ message: "Error creating campaign", error });
  //   }
  // },

  createCampaign: async (req: Request, res: Response): Promise<void> => {
    try {
      const ngoId = (req as any).user?.id;

      const ngo = await Ngo.findById(ngoId);
      if (!ngo) {
        res
          .status(403)
          .json({ message: "Complete your NGO profile before creating campaigns" });
        return;
      }

      // Frontend -> FormData: "data" (JSON string)
      let body: any = {};
      if (req.body.data) {
        try {
          body = JSON.parse(req.body.data);
        } catch (err) {
          res.status(400).json({ message: "Invalid data JSON in request" });
          return;
        }
      } else {
        body = req.body;
      }

      const {
        title,
        description,
        goalAmount,
        causeType,
        country,
        deadline,
        campaignSlug,
        status,

        fundraiserOptions,
        color,
        commonDonation,
        suggestedAmounts,
        taxReceipt,
        customQuestions,
        thankYouEmail,
        fundraiserEmail,
        advanced,
      } = body;

      const fundingGoal = goalAmount ? Number(goalAmount) : undefined;

      // cause ko filhaal causeType se hi set kar rahe hain
      const campaignType = causeType || undefined;
      const cause = causeType || "Other";

      const finalCountry = country || ngo.country || "Pakistan";

      const VALID_STATUS = ["draft", "ongoing", "paused", "completed"];
      const finalStatus = VALID_STATUS.includes(status)
        ? status
        : "draft"; // "active" allowed nahi hai schema me

      // Basic validation
      if (!title || !description || !fundingGoal || !cause || !finalCountry) {
        res.status(400).json({
          message:
            "Missing required campaign fields (title, description, funding goal, cause, country)",
        });
        return;
      }

      // Files: banner -> mainImage, logo -> additionalImages[0]
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      const mainImageFile =
        files?.banner?.[0] || // new frontend naam
        files?.mainImage?.[0]; // agar purana naam ho

      if (!mainImageFile) {
        res.status(400).json({ message: "Main image (banner) is required" });
        return;
      }

      const additionalImages: string[] = [];

      if (files?.logo?.[0]) {
        additionalImages.push(files.logo[0].path);
      }
      if (files?.additionalImages?.length) {
        additionalImages.push(
          ...files.additionalImages.map((file) => file.path)
        );
      }

      const media = {
        mainImage: mainImageFile.path,
        additionalImages,
      };

      const campaign = new Campaign({
        title,
        description,
        ngoId,
        fundingGoal,
        cause,
        campaignType,
        country: finalCountry,
        media,
        deadline: deadline ? Number(deadline) : undefined,
        status: finalStatus,

        color,
        fundraiserOptions,
        commonDonation,
        suggestedAmounts,
        taxReceipt,
        customQuestions,
        thankYouEmail,
        fundraiserEmail,
        advanced,

        campaignSlug, // optional, pre-save hook bhi handle karega
      });

      await campaign.save();

      res.status(201).json({
        message: "Campaign created successfully",
        campaign: {
          id: campaign._id,
          title: campaign.title,
          status: campaign.status,
          campaignSlug: campaign.campaignSlug,
        },
      });
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Error creating campaign", error });
    }
  },

  // Update campaign
  updateCampaign: async (req: Request, res: Response): Promise<void> => {
  try {
    const ngoId = (req as any).user?.id;
    const { campaignId } = req.params;

    // Verify campaign exists and belongs to this NGO
    const existingCampaign = await Campaign.findOne({
      _id: campaignId,
      ngoId,
    });

    if (!existingCampaign) {
      res
        .status(404)
        .json({ message: "Campaign not found or not authorized" });
      return;
    }

    // Frontend -> FormData: "data" (JSON string) same as createCampaign
    let body: any = {};
    if (req.body.data) {
      try {
        body = JSON.parse(req.body.data);
      } catch (err) {
        res.status(400).json({ message: "Invalid data JSON in request" });
        return;
      }
    } else {
      body = req.body;
    }

    const {
      title,
      description,
      goalAmount,
      causeType,
      country,
      status,
      deadline,

      fundraiserOptions,
      color,
      commonDonation,
      suggestedAmounts,
      taxReceipt,
      customQuestions,
      thankYouEmail,
      fundraiserEmail,
      advanced,
    } = body;

    const updateData: Partial<ICampaign> = {};

    // Basic fields (partial update)
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (goalAmount !== undefined) {
      updateData.fundingGoal = Number(goalAmount);
    }

    if (causeType !== undefined) {
      // Same mapping as createCampaign
      updateData.cause = causeType || "Other";
      updateData.campaignType = causeType || undefined;
    }

    if (country !== undefined) updateData.country = country;

    if (status !== undefined) {
      const VALID_STATUS = ["draft", "ongoing", "paused", "completed"];
      if (VALID_STATUS.includes(status)) {
        updateData.status = status as any;
      }
    }

    if (deadline !== undefined) {
      updateData.deadline = Number(deadline);
    }

    // Extra frontend fields
    if (fundraiserOptions !== undefined)
      updateData.fundraiserOptions = fundraiserOptions;
    if (color !== undefined) updateData.color = color;
    if (commonDonation !== undefined)
      updateData.commonDonation = commonDonation;
    if (suggestedAmounts !== undefined)
      updateData.suggestedAmounts = suggestedAmounts;
    if (taxReceipt !== undefined) updateData.taxReceipt = taxReceipt;
    if (customQuestions !== undefined)
      updateData.customQuestions = customQuestions;
    if (thankYouEmail !== undefined)
      updateData.thankYouEmail = thankYouEmail;
    if (fundraiserEmail !== undefined)
      updateData.fundraiserEmail = fundraiserEmail;
    if (advanced !== undefined) updateData.advanced = advanced;

    // Handle file uploads (banner / logo) – same convention as createCampaign
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;

    if (files) {
      // Start from existing media
      updateData.media = {
        mainImage: existingCampaign.media.mainImage,
        additionalImages: existingCampaign.media.additionalImages || [],
      };

      // Banner (or legacy mainImage)
      const bannerFile = files.banner?.[0] || files.mainImage?.[0];
      if (bannerFile) {
        updateData.media.mainImage = bannerFile.path;
      }

      // Additional images (logo + legacy additionalImages)
      const additionalImages: string[] = [
        ...(updateData.media.additionalImages || []),
      ];

      if (files.logo?.[0]) {
        additionalImages.push(files.logo[0].path);
      }

      if (files.additionalImages?.length) {
        additionalImages.push(
          ...files.additionalImages.map((file) => file.path)
        );
      }

      updateData.media.additionalImages = additionalImages;
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      campaignId,
      updateData,
      { new: true }
    );

    res.json({
      message: "Campaign updated successfully",
      campaign: {
        id: updatedCampaign!._id,
        title: updatedCampaign!.title,
        status: updatedCampaign!.status,
        campaignSlug: updatedCampaign!.campaignSlug,
      },
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ message: "Error updating campaign", error });
  }
  },

  // Get campaign by ID or slug
  getCampaign: async (req: Request, res: Response): Promise<void> => {
    try {
      const { identifier } = req.params; // Can be ID or slug

      let campaign;

      // Check if identifier is a valid MongoDB ID
      if (mongoose.Types.ObjectId.isValid(identifier)) {
        campaign = await Campaign.findById(identifier).populate(
          "ngoId",
          "name orgName"
        );
      } else {
        // Treat as slug
        campaign = await Campaign.findOne({
          campaignSlug: identifier,
        }).populate("ngoId", "name orgName");
      }

      if (!campaign) {
        res.status(404).json({ message: "Campaign not found" });
        return;
      }

      // Add total donors count to the response
      const campaignResponse = campaign.toObject();
      campaignResponse.donors = campaign.donations.length;

      // if (campaign.faqs) {
      //   if (typeof campaign.faqs === "string") {
      //     try {
      //       campaignResponse.faqs = JSON.parse(campaign.faqs);
      //     } catch {
      //       campaignResponse.faqs = [];
      //     }
      //   } else {
      //     campaignResponse.faqs = campaign.faqs;
      //   }
      // } else {
      //   campaignResponse.faqs = [];
      // }

      res.json(campaignResponse);
    } catch (error) {
      res.status(500).json({ message: "Error fetching campaign", error });
    }
  },

  // Get all campaigns (public)
  getAllCampaigns: async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, cause, country } = req.query;

      // Build query object
      const query: any = {};

      // Only show ongoing campaigns by default
      if (!status) {
        query.status = "ongoing";
      } else if (
        status &&
        ["draft", "ongoing", "paused", "completed"].includes(status as string)
      ) {
        query.status = status;
      }

      // Add cause and country to query if provided
      if (cause) query.cause = cause;
      if (country) query.country = country;

      const campaigns = await Campaign.find(query).populate(
        "ngoId",
        "name orgName"
      );

      // Add total donors count to each campaign
      const campaignsWithDonors = campaigns.map((campaign) => {
        const { donations, ...campaignObj } = campaign.toObject();
        campaignObj.donors = donations.length;
        return campaignObj;
      });

      res.json(campaignsWithDonors);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Error fetching campaigns", error });
    }
  },

  // Get NGO's campaigns
  getNgoCampaigns: async (req: Request, res: Response): Promise<void> => {
    try {
      const ngoId = req.user?.id;

      const campaigns = await Campaign.find({ ngoId }).sort({ createdAt: -1 });

      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Error fetching NGO campaigns", error });
    }
  },

  // Add donation to campaign
  addDonation: async (req: Request, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const { amount, donorName, donorEmail, message } = req.body;

      // Get donor ID if authenticated
      const donorId = req.user?.id;

      // Validate required fields
      if (!amount || !donorName) {
        res.status(400).json({ message: "Amount and donor name are required" });
        return;
      }

      // Create donation object
      const donation = {
        donorId: donorId || undefined,
        donorName,
        donorEmail,
        amount: Number(amount),
        message,
        timestamp: new Date(),
      };

      // Update campaign with new donation and increment totalRaised
      const campaign = await Campaign.findByIdAndUpdate(
        campaignId,
        {
          $push: { donations: donation },
          $inc: { totalRaised: Number(amount) },
        },
        { new: true }
      ).populate("ngoId", "name email");

      if (!campaign) {
        res.status(404).json({ message: "Campaign not found" });
        return;
      }

      // Send donation confirmation email
      await emailService.sendDonationConfirmationEmail(
        donorEmail,
        donorName,
        campaign.title,
        Number(amount),
        "USD",
        campaignId
      );

      // Add NGO notification email here since it was missing
      const ngo = campaign.ngoId as any; // Type assertion since we populated
      if (ngo && ngo.email) {
        await emailService.sendNgoDonationNotificationEmail(
          ngo.email,
          ngo.name,
          campaign.title,
          donorName,
          Number(amount),
          "USD",
          donorEmail
        );
      }

      res.status(201).json({
        message: "Donation added successfully",
        donation,
        totalRaised: campaign.totalRaised,
      });
    } catch (error) {
      res.status(500).json({ message: "Error processing donation", error });
    }
  },

  // Delete campaign
  deleteCampaign: async (req: Request, res: Response): Promise<void> => {
    try {
      const ngoId = req.user?.id;
      const { campaignId } = req.params;

      // Verify campaign exists and belongs to this NGO
      const campaign = await Campaign.findOne({
        _id: campaignId,
        ngoId,
      });

      if (!campaign) {
        res
          .status(404)
          .json({ message: "Campaign not found or not authorized" });
        return;
      }

      await Campaign.findByIdAndDelete(campaignId);

      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting campaign", error });
    }
  },

  // Add pending payment to campaign
  addPendingPayment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const {
        amount,
        donorName,
        donorEmail,
        paymentMethod,
        message,
        isRecurring,
      } = req.body;

      // Validate required fields
      if (!amount || !donorName || !paymentMethod) {
        res.status(400).json({
          message: "Amount, donor name, and payment method are required",
        });
        return;
      }

      // Create pending payment object
      const pendingPayment = {
        orderId: `PENDING-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        amount: Number(amount),
        donorName,
        donorEmail,
        paymentMethod,
        message,
        isRecurring: isRecurring || false,
        timestamp: new Date(),
      };

      // Update campaign with new pending payment
      const campaign = await Campaign.findByIdAndUpdate(
        campaignId,
        {
          $push: { pendingPayments: pendingPayment },
        },
        { new: true }
      ).populate("ngoId", "name email");

      if (!campaign) {
        res.status(404).json({ message: "Campaign not found" });
        return;
      }

      // Generate redirect URL based on payment method
      let redirectUrl = "";
      switch (paymentMethod) {
        case "stocks":
          redirectUrl = "https://donatestock.com/donate/new/?ein=331917403";
          break;
        case "daf":
          redirectUrl = "https://www.paypal.com/US/fundraiser/charity/5430283";
          break;
        case "crypto":
          redirectUrl =
            "https://nowpayments.io/donation?api_key=YD1SNEB-XM54FRT-KCBDK9Q-2ERAK01";
          break;
        case "paypal":
          redirectUrl = "https://www.paypal.com/ncp/payment/XJ9FMHGLQRUPA";
          break;
        case "venmo":
          redirectUrl = "https://www.paypal.com/ncp/payment/XJ9FMHGLQRUPA";
          break;
      }

      const ngo = await Ngo.findById(campaign.ngoId);
      if (ngo) {
        await emailService.sendNgoPendingPaymentNotificationEmail(
          ngo.email,
          ngo.name,
          campaign.title,
          donorName,
          amount,
          "USD",
          paymentMethod
        );
      }

      res.status(201).json({
        message: "Pending payment added successfully",
        pendingPayment,
        redirectUrl,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error processing pending payment", error });
    }
  },
};
