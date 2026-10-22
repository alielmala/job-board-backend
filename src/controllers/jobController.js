import Job from "../models/Job.js";
import escapeRegex from "../utils/escapeRegex.js";
import { AppError, NotFoundError } from "../errors/AppError.js";

const SORT_FIELDS = ["createdAt", "updatedAt", "title", "company"];

export const createJob = async (req, res) => {
  const { title, company, location, type, salary, description } = req.body;
  const job = await Job.create({
    title,
    company,
    location,
    type,
    salary,
    description,
    postedBy: req.user.id,
  });
  res.status(201).json({
    success: true,
    message: "Job created",
    job,
  });
};

export const updateJob = async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new NotFoundError("Job");
  if (job.postedBy.toString() !== req.user.id) {
    throw new AppError("You can only edit your own jobs", 403, "FORBIDDEN");
  }
  const { title, company, location, type, salary, description, isOpen } =
    req.body;

  if (title !== undefined) job.title = title;
  if (company !== undefined) job.company = company;
  if (location !== undefined) job.location = location;
  if (type !== undefined) job.type = type;
  if (salary !== undefined) job.salary = salary;
  if (description !== undefined) job.description = description;
  if (isOpen !== undefined) job.isOpen = isOpen;

  await job.save();

  res.json({ success: true, message: "Job updated", job });
};

export const deleteJob = async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new NotFoundError("Job");
  if (job.postedBy.toString() !== req.user.id) {
    throw new AppError("You can only delete your own jobs", 403, "FORBIDDEN");
  }
  await job.deleteOne();

  res.json({ success: true, message: "Job removed successfully" });
};

export const getJobs = async (req, res) => {
  const { location, type, salary_min, search, sort } = req.query;

  const filter = { isOpen: true };
  if (location) filter.location = new RegExp(escapeRegex(location), "i");
  if (type) filter.type = type;
  if (salary_min) filter.salary = { $gte: Number(salary_min) };
  if (search) filter.$text = { $search: search };

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  let sortBy = "-createdAt";
  if (sort) {
    const field = sort.startsWith("-") ? sort.slice(1) : sort;
    if (SORT_FIELDS.includes(field)) sortBy = sort;
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate("postedBy", "name email")
      .sort(sortBy)
      .skip(skip)
      .limit(limit),
    Job.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: jobs.length,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    jobs,
  });
};

export const getJobDetails = async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id).populate("postedBy", "name email");

  if (!job) {
    throw new NotFoundError("Job is not found", 404);
  }

  res.json({
    success: true,
    job,
  });
};

export const getMyJobs = async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user.id }).sort("-createdAt");

  res.json({ success: true, count: jobs.length, jobs });
};
