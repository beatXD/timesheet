import mongoose, { Schema, Model } from "mongoose";
import type { IHoliday } from "@/types";

const HolidaySchema = new Schema<IHoliday>(
  {
    date: { type: Date, required: true },
    name: { type: String, required: true },
    year: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

// Index for querying holidays by year
HolidaySchema.index({ year: 1 });
HolidaySchema.index({ date: 1 }, { unique: true });

const Holiday: Model<IHoliday> =
  mongoose.models.Holiday || mongoose.model<IHoliday>("Holiday", HolidaySchema);

export default Holiday;
