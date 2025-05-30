const { AppError } = require('../utils/AppError');

const ErrorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  console.error('Unexpected Error:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong on the server'
  });
};

module.exports = ErrorHandler;