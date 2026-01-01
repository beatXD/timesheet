import mongoose, { Schema, Model } from "mongoose";
import type { ITeam } from "@/types";

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, unique: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

export default Team;
