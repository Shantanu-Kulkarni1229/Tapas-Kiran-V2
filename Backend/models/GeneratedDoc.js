import mongoose from "mongoose";

// Record of each generated form, so there is a trail of who drafted what.
const generatedDocSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    stationKey: { type: String, index: true },
    template: { type: String, required: true },
    fields: mongoose.Schema.Types.Mixed,
    narrative: String,
  },
  { timestamps: true }
);

export const GeneratedDoc = mongoose.model("GeneratedDoc", generatedDocSchema);
