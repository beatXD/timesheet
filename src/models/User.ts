import mongoose, { Schema, Model } from "mongoose";
import type { IUser, UserRole } from "@/types";

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Date },
    image: { type: String },
    password: { type: String }, // For email/password auth
    role: {
      type: String,
      enum: ["admin", "leader", "user"] as UserRole[],
      default: "user",
    },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    contractRole: { type: String },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite in development
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
