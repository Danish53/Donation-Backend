import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Ngo } from "../models/Ngo";
import bcrypt from "bcrypt";
import { emailService } from "../utils/emailService";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const userController = {
  // register: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const { email, password, name } = req.body;

  //     const existingUser = await User.findOne({ email });
  //     if (existingUser) {
  //       res.status(400).json({ message: "User already exists" });
  //       return;
  //     }

  //     const user = new User({
  //       email,
  //       password,
  //       name,
  //     });

  //     await user.save();

  //     const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
  //       expiresIn: "24h",
  //     });

  //     res.status(201).json({
  //       message: "User created successfully",
  //       token,
  //       user: {
  //         id: user._id,
  //         email: user.email,
  //         name: user.name,
  //       },
  //     });
  //   } catch (error) {
  //     res.status(500).json({ message: "Error creating user", error });
  //   }
  // },

  // login: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const { email, password } = req.body;

  //     const user = await User.findOne({ email });
  //     if (!user) {
  //       res.status(401).json({ message: "Invalid credentials" });
  //       return;
  //     }

  //     const isMatch = await user.comparePassword(password);
  //     if (!isMatch) {
  //       res.status(401).json({ message: "Invalid credentials" });
  //       return;
  //     }

  //     const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
  //       expiresIn: "24h",
  //     });

  //     res.json({
  //       token,
  //       user: {
  //         id: user._id,
  //         email: user.email,
  //         name: user.name,
  //       },
  //     });
  //   } catch (error) {
  //     res.status(500).json({ message: "Error logging in", error });
  //   }
  // },

  // getUser: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const user = await User.findById(req.user?.id).select("-password");
  //     if (!user) {
  //       res.status(404).json({ message: "User not found" });
  //       return;
  //     }
  //     res.json(user);
  //   } catch (error) {
  //     res.status(500).json({ message: "Error fetching user", error });
  //   }
  // },

  inviteUser: async (req: Request, res: Response): Promise<void> => {
   try {
    const { ngoEmail, ngoPassword, firstName, lastName, email, permissions } =
      req.body;

    if (!ngoEmail || !ngoPassword || !firstName || !lastName || !email) {
       res.status(400).json({ message: "Missing required fields" });
       return;
    }

    // 1️⃣ Verify NGO password
    const ngo = await Ngo.findOne({ email: ngoEmail });
    if (!ngo) {
        res.status(404).json({ message: "NGO not found" });
        return;
    } 

    const isPasswordValid = await bcrypt.compare(ngoPassword.trim(), ngo.password);

    if (!isPasswordValid){
       res.status(401).json({ message: "NGO password incorrect" });
      return
    }

    // 2️⃣ Check if user email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser){
       res.status(400).json({ message: "User email already registered" });
      return
    }

    // 3️⃣ Generate random password
    const generatedPassword = crypto
      .randomBytes(6)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 10);
      console.log(generatedPassword)

    // 4️⃣ Create new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: generatedPassword,
      permissions,
      invitedBy: ngo._id,
      ngoId: ngo._id,
    });

    await newUser.save();

    // 5️⃣ Send email with credentials
    await emailService.sendWelcomeEmailUser(
      email,
      `${firstName} ${lastName}`,
      generatedPassword
    );

    res.status(201).json({
      message: "User invited successfully",
      userId: newUser._id,
    });
   } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
   }
  },

};
