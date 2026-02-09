const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const AppError = require('../../shared/utils/AppError');
const { User, Department } = require('../../models');

class AuthService {
  /**
   * 로그인 처리
   */
  async login(email, password) {
    // 1. 사용자 조회 (비밀번호 포함)
    const user = await User.findOne({
      where: { email },
      include: [{ model: Department, as: 'department' }],
    });

    if (!user) {
      throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    // 2. 비활성 계정 체크
    if (!user.is_active) {
      throw new AppError('비활성화된 계정입니다. 관리자에게 문의하세요.', 403);
    }

    // 3. 비밀번호 검증
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    // 4. 토큰 생성
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }

  /**
   * 리프레시 토큰으로 새 액세스 토큰 발급
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.is_active) {
        throw new AppError('유효하지 않은 리프레시 토큰입니다.', 401);
      }

      const accessToken = this.generateAccessToken(user);
      return { accessToken };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('리프레시 토큰이 만료되었거나 유효하지 않습니다.', 401);
    }
  }

  generateAccessToken(user) {
    return jwt.sign(
      { userId: user.user_id, role: user.role, email: user.email },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user.user_id },
      env.jwt.refreshSecret,
      { expiresIn: env.jwt.refreshExpiresIn }
    );
  }
}

module.exports = new AuthService();
