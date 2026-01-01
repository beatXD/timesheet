import mongoose, { Schema, Model } from "mongoose";
import type { IPlan } from "@/types";

const PlanSchema = new Schema<IPlan>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    description: { type: String },
    monthlyPrice: { type: Number, required: true, default: 0 },
    maxUsers: { type: Number, required: true, default: 1 },
    maxTeams: { type: Number, required: true, default: 1 },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    stripePriceId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Index for sorting and filtering
PlanSchema.index({ isActive: 1, sortOrder: 1 });

const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", PlanSchema);

export default Plan;
