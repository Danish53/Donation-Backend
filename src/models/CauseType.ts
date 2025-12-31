import mongoose, { Schema, Document } from "mongoose";

export interface IOCauseType extends Document {
  causeName: string;
  description?: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId; // admin id
  createdAt: Date;
  updatedAt: Date;
}

const CauseTypeSchema: Schema<IOCauseType> = new Schema(
  {
    causeName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // ya User
      required: false,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

export default mongoose.model<IOCauseType>(
  "CauseType",
  CauseTypeSchema
);
