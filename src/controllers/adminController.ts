import dotenv from "dotenv";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin";
import OrganizationType from "../models/OrganizationType";
import CauseType from "../models/CauseType";
import { Ngo } from "../models/Ngo";
import PayoutRequest from "../models/PayoutRequest";
import Stripe from "stripe";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil" as any,
});

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const adminController = {
  
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const admin = await Admin.findOne({ email });
      if (!admin) {
        res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
        return;
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
        return;
      }

      const token = jwt.sign({ userId: admin._id }, JWT_SECRET, {
        expiresIn: "24h",
      });

      res.json({
        success: true,
        data: {
          token,
          ngo: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: "admin",
            isVerified: true,
            status: "approved",
            profileComplete: true,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error logging in",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // ORGANIZATION IDENTITY TYPE MANAGEMENT
  addOrgnizationType: async (req: Request, res: Response): Promise<void> => {
    try {
      const { typeName, description, userId } = req.body;
      const existingType = await OrganizationType.findOne({ typeName });
      if (existingType) {
        res.status(400).json({
          success: false,
          error: "Organization type already exists",
        });
        return;
      }

      const newType = new OrganizationType({ typeName, description, createdBy: userId });
      await newType.save();

      res.status(201).json({
        success: true,
        data: newType,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error adding organization type",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  getOrganizationTypes: async (req: Request, res: Response): Promise<void> => {
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

  updateOrganizationType: async (req: Request, res: Response): Promise<void> => {
    try {
      const { typeId } = req.params;
      const updates = req.body;

      const updatedType = await OrganizationType.findByIdAndUpdate(typeId, updates, { new: true });
      if (!updatedType) {
        res.status(404).json({
          success: false,
          error: "Organization type not found",
        });
        return;
      }

      res.json({
        success: true,
        data: updatedType,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error updating organization type",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  deleteOrganizationType: async (req: Request, res: Response): Promise<void> => {
    try {
      const { typeId } = req.params;

      const deletedType = await OrganizationType.findByIdAndDelete(typeId);
      if (!deletedType) {
        res.status(404).json({
          success: false,
          error: "Organization type not found",
        });
        return;
      }

      res.json({
        success: true,
        data: deletedType,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error deleting organization type",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // Cause Type
  addCauseType: async (req: Request, res: Response): Promise<void> => {
    try {
      const { causeName, description, userId } = req.body;
      const existingCause = await CauseType.findOne({ causeName });
      if (existingCause) {
        res.status(400).json({
          success: false,
          error: "Cause type already exists",
        });
        return;
      }

      const newCause = new CauseType({ causeName, description, createdBy: userId });
      await newCause.save();

      res.status(201).json({
        success: true,
        data: newCause,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error adding cause type",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  getCauseTypes: async (req: Request, res: Response): Promise<void> => {
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

  updateCauseType: async (req: Request, res: Response): Promise<void> => {
    try {
      const { causeId } = req.params;
      const updates = req.body;

      const updatedCause = await CauseType.findByIdAndUpdate(causeId, updates, { new: true });
      if (!updatedCause) {
        res.status(404).json({
          success: false,
          error: "Cause type not found",
        });
        return;
      }

      res.json({
        success: true,
        data: updatedCause,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error updating cause type",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  deleteCauseType: async (req: Request, res: Response): Promise<void> => {
    try {
      const { causeId } = req.params;  

      const deletedCause = await CauseType.findByIdAndDelete(causeId);
      if (!deletedCause) {
        res.status(404).json({
          success: false,
          error: "Cause type not found",
        });
        return;
      }

      res.json({
        success: true,
        data: deletedCause,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error deleting cause type",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  updateNgoStatus: async (req: Request, res: Response): Promise<void> => {
    try { 
    const { ngoId, isActive } = req.body;

    if (!ngoId || typeof isActive !== "boolean") {
      res.status(400).json({
        message: "ngoId and isActive (boolean) are required",
      });
      return;
    }

    const ngo = await Ngo.findById(ngoId);
    if (!ngo) {
      res.status(404).json({ message: "NGO not found" });
      return;
    }

    ngo.isActive = isActive;
    await ngo.save();

    res.status(200).json({
      success: true,
      message: `NGO has been ${isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating NGO status",
      error,
    });
  }
},

getAllPayoutRequests: async (req: Request, res: Response): Promise<void> => {
  const list = await PayoutRequest
    .find({ payoutMode: "admin" })
    .populate("ngoId", "name email")
    .sort({ createdAt: -1 });

  res.json(list);
},

approvePayout: async (req: Request, res: Response): Promise<void>=>{
  const { id } = req.params;

  const request = await PayoutRequest.findById(id);

  if (!request){
      res.status(400).json({ message:"Invalid payout request" });
      return;
  }

  request.status = "paid";
  request.adminApprovedAt = new Date();

  await request.save();

  res.json({
    success: true,
    message: "Mark as paid after manual transfer"
  });
},


rejectPayout: async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const request = await PayoutRequest.findById(id);

  if (!request) {
     res.status(404).json({ message: "Not found" });
     return
  }

  request.status = "rejected";
  await request.save();

  res.json({ success: true, message: "Rejected" });
},


};