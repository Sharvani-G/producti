import mongoose from "mongoose";

const WeekSchema = new mongoose.Schema(
  {
    weekKey: { type: String, required: true, unique: true, index: true },
    days: { type: Object, default: {} }
  },
  { timestamps: true }
);

export default mongoose.model("Week", WeekSchema);
