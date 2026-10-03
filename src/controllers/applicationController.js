import Job from "../models/Job.js";
import {
  AppError,
  NotFoundError,
  ValidationError,
} from "../errors/AppError.js";
import { uploadCV, deleteCV } from "../config/cloudinary.js";
import Application from "../models/Application.js";

export const createApplication = async (req, res) => {
  if (!req.file) {
    throw new ValidationError("CV file is required");
  }
  const job = await Job.findById(req.params.id);
  console.log("Job found:", req.params.id);
  if (!job) throw new NotFoundError("Job");
  if (!job.isOpen) {
    throw new AppError(
      "This job is no longer accepting applications",
      400,
      "JOB_CLOSED",
    );
  }
  const existingApplication = await Application.findOne({
    job: job._id,
    applicant: req.user._id,
  });
  if (existingApplication) {
    throw new AppError(
      "You have already applied for this job",
      400,
      "DUPLICATE_APPLICATION",
    );
  }
  const result = await uploadCV(req.file.buffer, req.file.originalname);
  const application = await Application.create({
    job: job._id,
    applicant: req.user.id,
    coverLetter: req.body.coverLetter,
    cv: {
      url: result.secure_url,
      public_id: result.public_id,
      originalName: req.file.originalname,
      size: req.file.size,
    },
  });
  res.status(201).json({
    success: true,
    message: "Application submitted",
    application,
  });
};
