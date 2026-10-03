import express from "express";
import { protect, restrictTo } from "../middleware/auth.js";
import {
  createJob,
  getJobs,
  getJobDetails,
  updateJob,
  deleteJob,
  getMyJobs,
} from "../controllers/jobController.js";
import upload from "../middleware/upload.js";

import { createApplication } from "../controllers/applicationController.js";
const router = express.Router();

router.post("/", protect, restrictTo("recruiter"), createJob);
router.get("/", getJobs);
router.get("/me", protect, restrictTo("recruiter"), getMyJobs);

router.get("/:id", protect, getJobDetails);
router.put("/:id", protect, updateJob);
router.delete("/:id", protect, deleteJob);

router.post(
  "/:id/apply",
  protect,
  restrictTo("jobseeker"),
  upload.single("cv"),
  createApplication,
);
export default router;
