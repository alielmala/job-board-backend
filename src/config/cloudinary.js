import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadCV = (buffer, filename) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "job-board/cvs",
        public_id: `${Date.now()}-${filename.replace(/\.pdf$/i, "")}`,
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });

export const deleteCV = (publicId) =>
  cloudinary.uploader.destroy(publicId, { resource_type: "raw" });

export default cloudinary;
