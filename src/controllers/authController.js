import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import {
  AppError,
  UnauthorizedError,
  ValidationError,
} from "../errors/AppError.js";
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

export const getUserProfile = (req, res) => {
  res.json({ success: true, user: userResponse(req.user) });
};

export const updateUser = async (req, res) => {
  const { email, name } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError("User");

  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already in use", 409, "EMAIL_IN_USE");
    }
    user.email = email;
  }
  if (name) user.name = name;

  await user.save();

  res.json({
    success: true,
    message: "Profile updated",
    user: userResponse(user),
  });
};

export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ValidationError("Current and new password are required");
  }

  const user = await User.findById(req.user.id).select("+password");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  const token = generateToken(user._id);
  sendTokenCookie(res, token);

  res.json({ success: true, message: "Password updated", token });
};
