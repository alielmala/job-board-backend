import mongoose from "mongoose";
import { deleteCV } from "../config/cloudinary.js";

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverLetter: {
      type: String,
      required: true,
      maxlength: [2000, "Cover letter cannot exceed 2000 characters"],
    },
    cv: {
      url: {
        type: String,
        required: [true, "CV URL is required"],
      },
      public_id: {
        type: String,
        required: [true, "CV public ID is required"],
      },
      originalName: String,
      size: Number,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    if (this.cv?.publicId) {
      try {
        await deleteCV(this.cv.publicId);
      } catch (err) {
        console.error("Failed to delete CV from Cloudinary:", err.message);
      }
    }
  },
);
const Application = mongoose.model("Application", applicationSchema);

export default Application;
