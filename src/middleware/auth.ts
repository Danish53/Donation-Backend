import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "ngo" | "member";
        ngoId: string;
        permissions?: Record<string, boolean>;
      };
    }
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      role: "ngo" | "member";
      ngoId: string;
      permissions?: Record<string, boolean>;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Please authenticate" });
  }
};
