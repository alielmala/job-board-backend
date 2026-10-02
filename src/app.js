import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRouters.js";
import errorHandler from "./middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import jobRoutes from "./routes/jobRouters.js";
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use(morgan("dev"));
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "API is running",
  });
});
app.use(errorHandler);
export default app;
