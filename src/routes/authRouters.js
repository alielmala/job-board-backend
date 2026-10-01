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
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", protect, getUserProfile);
router.patch("/me", protect, updateUser);
router.patch("/me/password", protect, updatePassword);

export default router;
