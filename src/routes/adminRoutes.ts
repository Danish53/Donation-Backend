import express from "express";
import { adminController } from "../controllers/adminController";
import { campaignController } from "../controllers/campaignController";
import { ngoController } from "../controllers/ngoController";
import { adminAuth } from "../middleware/adminAuth";

const router = express.Router();

// Public routes
router.post("/login", adminController.login);

// Protected admin routes
router.use(adminAuth); // Apply admin authentication middleware to all routes below

// NGO management routes
router.get("/ngos", ngoController.getAllNgos);
router.put("/ngos/:ngoId/approve", ngoController.approveNgo);
router.put("/ngos/:ngoId/reject", ngoController.rejectNgo);

// Campaign management routes
router.get("/campaigns", campaignController.getAllCampaigns);

// Organization Type management routes
router.post("/organization-types", adminController.addOrgnizationType);
router.get("/organization-types", adminController.getOrganizationTypes);
router.put("/organization-types/:typeId", adminController.updateOrganizationType);
router.delete("/organization-types/:typeId", adminController.deleteOrganizationType);

// Cause Type management routes
router.post("/cause-types", adminController.addCauseType);
router.get("/cause-types", adminController.getCauseTypes);
router.put("/cause-types/:causeId", adminController.updateCauseType);
router.delete("/cause-types/:causeId", adminController.deleteCauseType);

export default router;
