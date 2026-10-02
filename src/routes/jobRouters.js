import express from "express";
import { protect, restrictTo } from "../middleware/auth.js";
import { createJob, getJobs } from "../controllers/jobController.js";

const router = express.Router();

router.post("/", protect, restrictTo("recruiter"), createJob);
router.get("/", getJobs);

export default router;
