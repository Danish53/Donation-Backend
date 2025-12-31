import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Email Configuration
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "givetoafrica7@gmail.com",

  // Frontend URL for email links
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:8080",
};
