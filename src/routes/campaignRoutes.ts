import express from "express";
import { campaignController } from "../controllers/campaignController";
import { auth } from "../middleware/auth";
import { processUploadedFiles, upload } from "../middleware/upload";

const router = express.Router();

// Public routes
router.get("/", campaignController.getAllCampaigns);
router.get("/:identifier", campaignController.getCampaign);
router.post("/:campaignId/donate", campaignController.addDonation);
router.post(
  "/:campaignId/pending-payment",
  campaignController.addPendingPayment
);

// Protected NGO routes
router.get("/ngo/my-campaigns", auth, campaignController.getNgoCampaigns);
router.post(
  "/",
  auth,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 2 },
  ]),
  processUploadedFiles,
  campaignController.createCampaign
);

router.put(
  "/:campaignId",
  auth,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 2 },
  ]),
  processUploadedFiles,
  campaignController.updateCampaign
);

router.delete("/:campaignId", auth, campaignController.deleteCampaign);

export default router;
