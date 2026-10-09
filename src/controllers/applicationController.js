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

export const getMyApplications = async (req, res) => {
  const applications = await Application.find({ applicant: req.user._id })
    .populate("job")
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    applications,
  });
};

export const getJobApplicants = async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new NotFoundError("Job");

  if (job.postedBy.toString() !== req.user.id.toString()) {
    throw new AppError(
      "You are not authorized to view applications for this job",
      403,
      "UNAUTHORIZED",
    );
  }
  const { status } = req.query;
  const filter = { job: job._id };
  if (status) filter.status = status;
  const applications = await Application.find(filter)
    .populate("applicant", "name email")
    .sort("-createdAt");
  res.json({
    success: true,
    count: applications.length,
    job: { id: job._id, title: job.title },
    applications,
  });
};
