import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeaveQuota {
  total: number;
  used: number;
}

export interface ILeaveBalance extends Document {
  userId: mongoose.Types.ObjectId;
  year: number;
  quotas: {
    sick: ILeaveQuota;
    personal: ILeaveQuota;
    annual: ILeaveQuota;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LeaveQuotaSchema = new Schema<ILeaveQuota>(
  {
    total: { type: Number, required: true, default: 0 },
    used: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    quotas: {
      sick: { type: LeaveQuotaSchema, default: () => ({ total: 30, used: 0 }) },
      personal: { type: LeaveQuotaSchema, default: () => ({ total: 3, used: 0 }) },
      annual: { type: LeaveQuotaSchema, default: () => ({ total: 6, used: 0 }) },
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one balance record per user per year
LeaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

// Helper method to get remaining balance
LeaveBalanceSchema.methods.getRemaining = function (leaveType: "sick" | "personal" | "annual") {
  const quota = this.quotas[leaveType];
  return quota.total - quota.used;
};

// Static method to get or create balance for a user/year
LeaveBalanceSchema.statics.getOrCreateForUser = async function (
  userId: mongoose.Types.ObjectId | string,
  year: number,
  defaultQuotas?: { sick: number; personal: number; annual: number }
) {
  let balance = await this.findOne({ userId, year });

  if (!balance) {
    const quotas = defaultQuotas || { sick: 30, personal: 3, annual: 6 };
    balance = await this.create({
      userId,
      year,
      quotas: {
        sick: { total: quotas.sick, used: 0 },
        personal: { total: quotas.personal, used: 0 },
        annual: { total: quotas.annual, used: 0 },
      },
    });
  }

  return balance;
};

export interface ILeaveBalanceModel extends Model<ILeaveBalance> {
  getOrCreateForUser(
    userId: mongoose.Types.ObjectId | string,
    year: number,
    defaultQuotas?: { sick: number; personal: number; annual: number }
  ): Promise<ILeaveBalance>;
}

const LeaveBalance: ILeaveBalanceModel =
  (mongoose.models.LeaveBalance as ILeaveBalanceModel) ||
  mongoose.model<ILeaveBalance, ILeaveBalanceModel>("LeaveBalance", LeaveBalanceSchema);

export default LeaveBalance;
