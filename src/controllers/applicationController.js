import { Readable } from "node:stream";
import Job from "../models/Job.js";
import {
  AppError,
  NotFoundError,
  ValidationError,
} from "../errors/AppError.js";
import { uploadCV, deleteCV } from "../config/cloudinary.js";
import Application from "../models/Application.js";

const ALLOWED_STATUSES = ["pending", "accepted", "rejected"];

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

export const updateApplicationStatus = async (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new ValidationError("Invalid application status");
  }
  const application = await Application.findById(req.params.id)
    .populate("applicant", "name email")
    .populate("job", "postedBy");
  if (!application) throw new NotFoundError("Application");
  if (application.job.postedBy.toString() !== req.user.id.toString()) {
    throw new AppError(
      "You are not authorized to update this application",
      403,
      "UNAUTHORIZED",
    );
  }
  application.status = status;
  await application.save();
  res.json({
    success: true,
    message: "Application status updated",
    application,
  });
};

export const withdrawApplication = async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new NotFoundError("Application");
  if (application.applicant.toString() !== req.user.id.toString()) {
    throw new AppError(
      "You are not authorized to withdraw this application",
      403,
      "UNAUTHORIZED",
    );
  }
  if (application.status !== "pending") {
    throw new AppError(
      "You can only withdraw applications that are pending",
      400,
      "INVALID_STATUS",
    );
  }
  await application.deleteOne();
  res.json({
    success: true,
    message: "Application withdrawn",
  });
};

const cvDisposition = (name) => {
  const ascii = name
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\\r\n]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const fallback = /\S/.test(ascii.replace(/\.[^.]*$/, "")) ? ascii : "cv.pdf";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

export const downloadCV = async (req, res) => {
  const application = await Application.findById(req.params.id).populate("job");
  if (!application) throw new NotFoundError("Application");
  if (!application.job) throw new NotFoundError("Job");

  const isApplicant = application.applicant.toString() === req.user.id;
  const isJobOwner = application.job.postedBy.toString() === req.user.id;
  if (!isApplicant && !isJobOwner) {
    throw new AppError("You are not allowed to view this CV", 403, "FORBIDDEN");
  }

  const upstream = await fetch(application.cv.url);
  if (!upstream.ok || !upstream.body) {
    throw new AppError("CV file is unavailable", 502, "CV_UNAVAILABLE");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    cvDisposition(application.cv.originalName || "cv.pdf"),
  );
  if (application.cv.size) res.setHeader("Content-Length", application.cv.size);

  Readable.fromWeb(upstream.body).pipe(res);
};
