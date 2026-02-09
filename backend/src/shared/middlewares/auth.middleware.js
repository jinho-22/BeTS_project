const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const AppError = require('../utils/AppError');
const { User } = require('../../models');

/**
 * JWT 토큰 검증 미들웨어
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Authorization 헤더에서 Bearer 토큰 추출
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('인증이 필요합니다. 로그인해 주세요.', 401));
    }

    // 토큰 검증
    const decoded = jwt.verify(token, env.jwt.secret);

    // 사용자 조회
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return next(new AppError('해당 토큰의 사용자가 존재하지 않습니다.', 401));
    }

    if (!user.is_active) {
      return next(new AppError('비활성화된 계정입니다. 관리자에게 문의하세요.', 403));
    }

    // 요청 객체에 사용자 정보 저장
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('유효하지 않은 토큰입니다.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('토큰이 만료되었습니다. 다시 로그인해 주세요.', 401));
    }
    next(error);
  }
};

module.exports = { authenticate };
