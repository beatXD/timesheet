import mongoose, { Schema, Model } from "mongoose";
import type { IGitHubRepoSettings } from "@/types";

const GitHubRepositorySchema = new Schema(
  {
    owner: { type: String, required: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    isPrivate: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const GitHubRepoSettingsSchema = new Schema<IGitHubRepoSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    repositories: [GitHubRepositorySchema],
    lastSyncedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookup by userId
GitHubRepoSettingsSchema.index({ userId: 1 });

const GitHubRepoSettings: Model<IGitHubRepoSettings> =
  mongoose.models.GitHubRepoSettings ||
  mongoose.model<IGitHubRepoSettings>(
    "GitHubRepoSettings",
    GitHubRepoSettingsSchema
  );

export default GitHubRepoSettings;
