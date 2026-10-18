import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUser,
  updatePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
const router = express.Router();

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/logout", logoutUser);
router.get("/me", protect, getUserProfile);
router.patch("/me", protect, updateUser);
router.patch("/me/password", protect, updatePassword);

export default router;
