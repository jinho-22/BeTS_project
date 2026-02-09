const authService = require('./auth.service');
const { sendSuccess } = require('../../shared/utils/response');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      sendSuccess(res, result, '로그인 성공');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);
      sendSuccess(res, result, '토큰 갱신 성공');
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      sendSuccess(res, req.user.toJSON(), '사용자 정보 조회 성공');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
