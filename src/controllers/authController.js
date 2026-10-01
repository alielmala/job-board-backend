import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { AppError, UnauthorizedError } from "../errors/AppError.js";
import sendTokenCookie from "../utils/sendTokenCookie.js";

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const registerUser = async (req, res) => {
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    throw new AppError("Email already in use", 400, "EMAIL_IN_USE");
  }
  const user = await User.create(req.body);
  const token = generateToken(user._id);
  sendTokenCookie(res, token);

  res.status(201).json({
    success: true,
    message: "Account created",
    user: userResponse(user),
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const token = generateToken(user._id);
  sendTokenCookie(res, token);

  res.status(200).json({
    success: true,
    message: "Logged in",
    user: userResponse(user),
  });
};

export const logoutUser = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  res.json({ success: true, message: "Logged out" });
};
