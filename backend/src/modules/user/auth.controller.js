const authService = require('./auth.service');
const env = require('../../config/env');
const { sendSuccess } = require('../../shared/utils/response');

const isProduction = env.nodeEnv === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  path: '/',
};

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      // HttpOnly 쿠키로 토큰 설정
      res.cookie('accessToken', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 60 * 60 * 1000, // 1h
      });
      res.cookie('refreshToken', result.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
      });

      // 응답에서 토큰 제외, 사용자 정보 + 비밀번호 변경 필요 여부 전달
      sendSuccess(res, {
        user: result.user,
        mustChangePassword: result.mustChangePassword,
      }, '로그인 성공');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ success: false, message: '리프레시 토큰이 없습니다.' });
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.cookie('accessToken', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 60 * 60 * 1000,
      });

      sendSuccess(res, null, '토큰 갱신 성공');
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res) {
    res.clearCookie('accessToken', { ...COOKIE_OPTIONS });
    res.clearCookie('refreshToken', { ...COOKIE_OPTIONS });
    sendSuccess(res, null, '로그아웃 성공');
  }

  async me(req, res, next) {
    try {
      sendSuccess(res, req.user.toJSON(), '사용자 정보 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user.user_id, currentPassword, newPassword);
      sendSuccess(res, null, '비밀번호가 성공적으로 변경되었습니다.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
