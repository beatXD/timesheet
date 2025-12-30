import mongoose, { Schema, Model } from "mongoose";
import type { IVendor } from "@/types";

const VendorSchema = new Schema<IVendor>(
  {
    name: { type: String, required: true },
    contractNo: { type: String },
  },
  {
    timestamps: true,
  }
);

const Vendor: Model<IVendor> =
  mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", VendorSchema);

export default Vendor;
