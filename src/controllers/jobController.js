import Job from "../models/Job.js";
import escapeRegex from "../utils/escapeRegex.js";

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

export const getJobs = async (req, res) => {
  const { location, type, salary_min, search } = req.query;
  const filter = { isOpen: true };

  if (location) filter.location = new RegExp(escapeRegex(location), "i");
  if (type) filter.type = type;
  if (salary_min) filter.salary = { $gte: Number(salary_min) };
  if (search) filter.$text = { $search: search };
  const jobs = await Job.find(filter)
    .populate("postedBy", "name email")
    .sort("-createdAt");

  res.json({
    success: true,
    count: jobs.length,
    jobs,
  });
};
