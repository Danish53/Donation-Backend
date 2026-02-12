import express from "express";
import { ngoController } from "../controllers/ngoController";
import { adminAuth } from "../middleware/adminAuth";
import { auth } from "../middleware/auth";
import rateLimit from "express-rate-limit";
import {
  processSingleUploadedFile,
  processUploadedFiles,
  upload,
} from "../middleware/upload";

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

// Public routes
router.post("/register", upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "workSamples", maxCount: 5 },
  ]), ngoController.registerBasic);
router.post("/login", ngoController.login);
router.post("/forgot-password", limiter, ngoController.requestPasswordReset);
router.post("/forgot-password/verify", limiter, ngoController.verifyPasswordResetOtp);
router.post("/forgot-password/complete", limiter, ngoController.completePasswordReset);

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

// ngo stripe balance
router.get("/stripe/balance", auth, ngoController.getNgoBalanceStripe);
router.get("/stripe/transactions", auth, ngoController.getNgoTransactionsStripe);
router.get("/stripe/payouts", auth, ngoController.getNgoPayoutsStripe);
router.post("/stripe/payout-request", auth, ngoController.createPayoutRequest);
// router.post("/stripe/payout", auth, ngoController.createNgoPayoutStripe);

router.get("/ngo-balance-payout", auth, ngoController.getNgoBalance);

// deactivate account
router.post("/deactivate", auth, ngoController.deactivateNgo);


export default router;
