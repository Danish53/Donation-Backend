import { Schema, model, Document, Types } from "mongoose";

export type ResetUserType = "ngo" | "member";

export interface IPasswordReset extends Document {
  email: string;
  userId: Types.ObjectId;
  userType: ResetUserType;
  otpHash: string;
  otpExpiresAt: Date;
  attempts: number;
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    email: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    userType: { type: String, enum: ["ngo", "member"], required: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    resetTokenHash: { type: String },
    resetTokenExpiresAt: { type: Date, index: true },
  },
  { timestamps: true }
);

// Auto-clean after 1 day
PasswordResetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const PasswordReset = model<IPasswordReset>("PasswordReset", PasswordResetSchema);