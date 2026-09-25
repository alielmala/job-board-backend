import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRouters.js";
import errorHandler from "./middleware/errorHandler.js";
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api/auth", authRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "API is running",
  });
});
app.use(errorHandler);
export default app;
