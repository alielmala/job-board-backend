import multer from "multer";
import { AppError } from "../errors/AppError.js";

const fileFilter = (req, file, cb) => {
  const isPdf =
    file.mimetype === "application/pdf" &&
    file.originalname.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return cb(new AppError("CV must be a PDF file", 400, "INVALID_FILE_TYPE"));
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
