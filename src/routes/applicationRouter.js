import express from "express";
import { protect, restrictTo } from "../middleware/auth.js";
import {
  updateApplicationStatus,
  withdrawApplication,
  getMyApplications,
  downloadCV,
} from "../controllers/applicationController.js";
const router = express.Router();

router.get("/my", protect, restrictTo("jobseeker"), getMyApplications);
router.get("/:id/cv", protect, downloadCV);
router.patch(
  "/:id/status",
  protect,
  restrictTo("recruiter"),
  updateApplicationStatus,
);
router.delete("/:id", protect, restrictTo("jobseeker"), withdrawApplication);
export default router;
