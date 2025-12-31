import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string };
    }
  }
}

export const adminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // Verify that the user is an admin
    const admin = await Admin.findById(decoded.userId);
    if (!admin) {
      res.status(403).json({ message: "Admin access required" });
      return;
    }

    req.admin = { id: decoded.userId };
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid authentication token" });
  }
};
