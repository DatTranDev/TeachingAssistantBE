const { AppError } = require("../utils/AppError");

const ErrorHandler = (err, req, res, next) => {
  // express-validator / Joi validation errors (our own AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Mongoose document validation failures
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors,
    });
  }

  // Mongoose invalid ObjectId cast
  if (err.name === "CastError") {
    return res.status(400).json({
      status: "error",
      message: `Invalid value for field "${err.path}": ${err.value}`,
      code: "INVALID_ID",
    });
  }

  // JWT / express-jwt unauthorised
  if (err.status === 401 || err.status === "401") {
    return res.status(401).json({
      status: "error",
      message: "Unauthorized access",
    });
  }

  console.error("Unexpected Error:", err);
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    status: "error",
    message: err.message || "Something went wrong on the server",
  });
};

module.exports = ErrorHandler;
