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
