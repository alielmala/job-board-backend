import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRouters.js";
import errorHandler from "./middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import jobRoutes from "./routes/jobRouters.js";
import { NotFoundError } from "./errors/AppError.js";
import helmet from "helmet";
import applicationRoutes from "./routes/applicationRouter.js";
const app = express();
app.use(helmet());
app.set("trust proxy", 1);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use(morgan("dev"));
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "API is running",
  });
});

app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl}`));
});

app.use(errorHandler);

export default app;
