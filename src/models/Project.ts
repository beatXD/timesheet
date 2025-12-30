import mongoose, { Schema, Model } from "mongoose";
import type { IProject } from "@/types";

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    description: { type: String },
  },
  {
    timestamps: true,
  }
);

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
