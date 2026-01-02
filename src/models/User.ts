import mongoose, { Schema, Model } from "mongoose";
import type { IUser, UserRole, SubscriptionPlan, SubscriptionStatus } from "@/types";

const SubscriptionSchema = new Schema(
  {
    plan: {
      type: String,
      enum: ["free", "team", "enterprise"] as SubscriptionPlan[],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "past_due"] as SubscriptionStatus[],
      default: "active",
    },
    maxUsers: { type: Number, default: 1 },
    maxTeams: { type: Number, default: 1 },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    currentPeriodEnd: { type: Date },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Date },
    image: { type: String },
    password: { type: String }, // For email/password auth
    role: {
      type: String,
      enum: ["super_admin", "admin", "user"] as UserRole[],
      default: "user",
    },
    teamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    contractRole: { type: String },
    subscription: { type: SubscriptionSchema },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite in development
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
