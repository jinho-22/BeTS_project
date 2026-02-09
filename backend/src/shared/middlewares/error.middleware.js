const AppError = require('../utils/AppError');

/**
 * 글로벌 에러 핸들러 미들웨어
 */
const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  // Production
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  }

  // 프로그래밍/예상치 못한 에러
  console.error('ERROR 💥', err);
  return res.status(500).json({
    success: false,
    status: 'error',
    message: '서버 내부 오류가 발생했습니다.',
  });
};

/**
 * 404 Not Found 핸들러
 */
const notFoundHandler = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `요청한 경로를 찾을 수 없습니다: ${req.originalUrl}`,
  });
};

module.exports = { errorHandler, notFoundHandler };
