import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const userController = {
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
      }

      const user = new User({
        email,
        password,
        name,
      });

      await user.save();

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
        expiresIn: "24h",
      });

      res.status(201).json({
        message: "User created successfully",
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Error creating user", error });
    }
  },

  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
        expiresIn: "24h",
      });

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Error logging in", error });
    }
  },

  getUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.user?.id).select("-password");
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user", error });
    }
  },
};
