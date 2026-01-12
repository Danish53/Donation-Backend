import bcrypt from "bcryptjs";
import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  permissions: Record<string, boolean>;
  invitedBy: mongoose.Types.ObjectId;
  role: string;
  ngoId: mongoose.Types.ObjectId;
  isActive: Boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  role: {
    type: String,
    enum: ["member"],
    default: "member",
  },

  permissions: { type: Object, default: {} },

  ngoId: {
    type: Schema.Types.ObjectId,
    ref: "Ngo",
    required: true,
  },

  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: "Ngo",
  },

  isActive: { type: Boolean, default: true },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);
