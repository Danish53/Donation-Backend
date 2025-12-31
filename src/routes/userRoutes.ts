import express from "express";
import { userController } from "../controllers/userController";
import { auth } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = express.Router();

// Auth routes
router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/me", auth, userController.getUser);

// Example of file upload route
router.post(
  "/upload-document",
  auth,
  upload.single("document"),
  (req: express.Request, res: express.Response): void => {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }
    res.json({
      message: "File uploaded successfully",
      file: req.file,
    });
  }
);

export default router;
