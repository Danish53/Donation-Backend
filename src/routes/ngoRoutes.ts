import express from "express";
import { ngoController } from "../controllers/ngoController";
import { adminAuth } from "../middleware/adminAuth";
import { auth } from "../middleware/auth";
import {
  processSingleUploadedFile,
  processUploadedFiles,
  upload,
} from "../middleware/upload";

const router = express.Router();

// Public routes
router.post("/register", upload.single("profileImage"), ngoController.registerBasic);
router.post("/login", ngoController.login);

// Protected NGO routes
router.get("/profile", auth, ngoController.getProfile);
router.put("/complete-profile", auth, ngoController.completeProfile);
router.post("/complete-bank-details", auth, ngoController.completeBankDetails);
router.post(
  "/stripe/onboarding/start",
  auth,
  ngoController.startOnboarding
);
router.get("/stripe/onboarding/refresh", ngoController.refreshOnboarding);
router.get(
  "/stripe/status",
  auth,
  ngoController.getAccountStatus
);

router.put("/update-profile", auth, ngoController.updateProfile);

// Profile image upload
router.post(
  "/upload-profile-image",
  auth,
  upload.single("profileImage"),
  processSingleUploadedFile,
  ngoController.uploadProfileImage
);

// Document upload with multiple files
router.post(
  "/upload-documents",
  auth,
  upload.fields([
    { name: "registrationCertificate", maxCount: 1 },
    { name: "leadershipProof", maxCount: 1 },
    { name: "additionalDocument", maxCount: 1 },
  ]),
  processUploadedFiles,
  ngoController.uploadDocuments
);

// Admin routes
router.get("/all", adminAuth, ngoController.getAllNgos);
router.put("/:ngoId/approve", ngoController.approveNgo);
router.put("/:ngoId/reject", adminAuth, ngoController.rejectNgo);

// paypal account create
router.post("/:ngoId/paypal-onboarding", ngoController.generatePaypalOnboardingLink);
router.post("/paypal-complete/:ngoId", ngoController.completeOnboarding);
router.get("/paypal-client-token", ngoController.generatePaypalClientToken);

// organization causes routes
router.get("/organization-types-all", ngoController.getOrganizationTypesAll);
router.get("/cause-types-all", ngoController.getCauseTypesAll);

export default router;
