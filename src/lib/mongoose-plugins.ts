import { Schema, Query } from "mongoose";

/**
 * Mongoose plugin for soft delete functionality
 * Adds deletedAt and deletedBy fields to the schema
 * Automatically filters out soft-deleted documents in queries
 */
export function softDeletePlugin(schema: Schema) {
  // Add soft delete fields
  schema.add({
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  });

  // Index for filtering soft-deleted documents
  schema.index({ deletedAt: 1 });

  // Add soft delete method
  schema.methods.softDelete = async function (userId?: string) {
    this.deletedAt = new Date();
    if (userId) {
      this.deletedBy = userId;
    }
    return this.save();
  };

  // Add restore method
  schema.methods.restore = async function () {
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };

  // Static method to soft delete by ID
  schema.statics.softDeleteById = async function (id: string, userId?: string) {
    return this.findByIdAndUpdate(
      id,
      {
        deletedAt: new Date(),
        ...(userId && { deletedBy: userId }),
      },
      { new: true }
    );
  };

  // Static method to restore by ID
  schema.statics.restoreById = async function (id: string) {
    return this.findByIdAndUpdate(
      id,
      {
        deletedAt: null,
        deletedBy: null,
      },
      { new: true }
    );
  };

  // Static method to find including deleted
  schema.statics.findWithDeleted = function (filter = {}) {
    return this.find(filter);
  };

  // Static method to find only deleted
  schema.statics.findDeleted = function (filter = {}) {
    return this.find({ ...filter, deletedAt: { $ne: null } });
  };

  // Pre-hook to filter out soft-deleted documents by default
  const excludeDeleted = function (this: Query<unknown, unknown>) {
    // Only add filter if not explicitly querying deleted documents
    const conditions = this.getQuery();
    if (conditions.deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
  };

  schema.pre("find", excludeDeleted);
  schema.pre("findOne", excludeDeleted);
  schema.pre("findOneAndUpdate", excludeDeleted);
  schema.pre("countDocuments", excludeDeleted);
  schema.pre("aggregate", function () {
    // Add match stage at the beginning to filter deleted documents
    const pipeline = this.pipeline();
    const hasDeletedFilter = pipeline.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stage: any) =>
        stage.$match &&
        Object.prototype.hasOwnProperty.call(stage.$match, "deletedAt")
    );

    if (!hasDeletedFilter) {
      pipeline.unshift({ $match: { deletedAt: null } });
    }
  });
}

// Type declarations for the plugin
declare module "mongoose" {
  interface Document {
    deletedAt?: Date | null;
    deletedBy?: Schema.Types.ObjectId | null;
    softDelete(userId?: string): Promise<this>;
    restore(): Promise<this>;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  interface Model<TRawDocType, TQueryHelpers = {}, TInstanceMethods = {}, TVirtuals = {}, THydratedDocumentType = HydratedDocument<TRawDocType, TVirtuals & TInstanceMethods, TQueryHelpers, TVirtuals>, TSchema = any, TLeanResultType = TRawDocType> {
    softDeleteById(id: string, userId?: string): Promise<TRawDocType | null>;
    restoreById(id: string): Promise<TRawDocType | null>;
    findWithDeleted(filter?: object): Query<TRawDocType[], TRawDocType>;
    findDeleted(filter?: object): Query<TRawDocType[], TRawDocType>;
  }
}
