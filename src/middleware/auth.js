import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { UnauthorizedError } from "../errors/AppError.js";

export const protect = async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token) {
    throw new UnauthorizedError("Invalid or expired token");
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new UnauthorizedError("User no longer exists");
  }
  req.user = user;
  next();
};

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError("You do not have permission", 403, "FORBIDDEN");
    }
    next();
  };
