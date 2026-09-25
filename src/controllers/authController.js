import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { AppError, UnauthorizedError } from "../errors/AppError.js";

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
  res.status(201).json({
    success: true,
    message: "Account created",
    user: userResponse(user),
    token: generateToken(user._id),
  });
};
