const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details?.length && { details: err.details }),
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(err.errors)[0].message,
      code: "VALIDATION_ERROR",
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: `${Object.keys(err.keyValue)[0]} already in use`,
      code: "DUPLICATE_KEY",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      code: "INVALID_ID",
    });
  }

  res.status(500).json({
    success: false,
    message: "Something went wrong",
    code: "INTERNAL_SERVER_ERROR",
  });
};

export default errorHandler;
