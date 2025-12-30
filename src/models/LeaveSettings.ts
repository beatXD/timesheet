import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveSettings extends Document {
  defaultQuotas: {
    sick: number;
    personal: number;
    annual: number;
  };
  resetMonth: number; // 1-12, month when balances reset
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const LeaveSettingsSchema = new Schema<ILeaveSettings>(
  {
    defaultQuotas: {
      sick: { type: Number, required: true, default: 30 },
      personal: { type: Number, required: true, default: 3 },
      annual: { type: Number, required: true, default: 6 },
    },
    resetMonth: {
      type: Number,
      required: true,
      default: 1, // January
      min: 1,
      max: 12,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get settings (singleton pattern - only one settings doc)
LeaveSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();

  if (!settings) {
    settings = await this.create({
      defaultQuotas: {
        sick: 30,
        personal: 3,
        annual: 6,
      },
      resetMonth: 1,
    });
  }

  return settings;
};

export interface ILeaveSettingsModel extends mongoose.Model<ILeaveSettings> {
  getSettings(): Promise<ILeaveSettings>;
}

const LeaveSettings: ILeaveSettingsModel =
  (mongoose.models.LeaveSettings as ILeaveSettingsModel) ||
  mongoose.model<ILeaveSettings, ILeaveSettingsModel>("LeaveSettings", LeaveSettingsSchema);

export default LeaveSettings;
