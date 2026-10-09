import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minLength: [3, "Title must be at least 3 characters"],
    },
    company: {
      type: String,
      required: [true, "Company is required"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: ["full-time", "part-time", "contract", "internship"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);
jobSchema.index({ title: "text", company: "text", description: "text" });
jobSchema.pre("deleteOne", { document: true, query: false }, async function () {
  const Application = mongoose.model("Application");
  const applications = await Application.find({ job: this._id });

  for (const app of applications) {
    await app.deleteOne();
  }
});
const Job = mongoose.model("Job", jobSchema);

export default Job;
