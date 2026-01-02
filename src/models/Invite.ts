import mongoose, { Schema, Model } from "mongoose";
import type { IInvite } from "@/types";

const InviteSchema = new Schema<IInvite>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    email: { type: String }, // Optional: email the invite was sent to
    expiresAt: { type: Date, required: true },
    maxUses: { type: Number, required: true },
    usedCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Index for token lookup
InviteSchema.index({ token: 1 });
// Index to find active invites by team
InviteSchema.index({ teamId: 1, expiresAt: 1 });

const Invite: Model<IInvite> =
  mongoose.models.Invite || mongoose.model<IInvite>("Invite", InviteSchema);

export default Invite;
