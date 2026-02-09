const AppError = require('../utils/AppError');

/**
 * Joi 스키마 기반 유효성 검사 미들웨어
 * @param {Object} schema - Joi 검증 스키마 { body, query, params }
 * @returns {Function} Express 미들웨어
 */
const validate = (schema) => {
  return (req, res, next) => {
    const targets = ['body', 'query', 'params'];
    const errors = [];

    for (const target of targets) {
      if (schema[target]) {
        const { error, value } = schema[target].validate(req[target], {
          abortEarly: false,
          stripUnknown: true,
        });

        if (error) {
          const details = error.details.map((d) => ({
            field: d.path.join('.'),
            message: d.message,
          }));
          errors.push(...details);
        } else {
          req[target] = value; // 검증된 값으로 교체
        }
      }
    }

    if (errors.length > 0) {
      return next(new AppError(`입력값 검증 실패: ${errors.map(e => e.message).join(', ')}`, 400));
    }

    next();
  };
};

module.exports = { validate };
