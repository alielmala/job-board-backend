import express from "express";
import { protect, restrictTo } from "../middleware/auth.js";
import { getMyApplications } from "../controllers/applicationController.js";

const router = express.Router();

router.get("/my", protect, restrictTo("jobseeker"), getMyApplications);

export default router;
