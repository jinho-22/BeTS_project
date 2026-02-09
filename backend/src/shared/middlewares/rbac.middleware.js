const AppError = require('../utils/AppError');

/**
 * RBAC (Role-Based Access Control) 미들웨어
 * 허용된 역할만 접근 가능하도록 제어합니다.
 *
 * @param  {...string} roles - 허용할 역할 목록 ('admin', 'manager', 'engineer')
 * @returns {Function} Express 미들웨어
 *
 * @example
 * router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('인증이 필요합니다.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('해당 작업에 대한 권한이 없습니다.', 403));
    }

    next();
  };
};

module.exports = { authorize };
