import mongoose, { Schema, Model } from "mongoose";
import type { ITeam } from "@/types";

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, unique: true },
    leaderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
  },
  {
    timestamps: true,
  }
);

const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

export default Team;
