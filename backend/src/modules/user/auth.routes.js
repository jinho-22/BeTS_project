const router = require('express').Router();
const authController = require('./auth.controller');
const { validate } = require('../../shared/middlewares/validation.middleware');
const { authenticate } = require('../../shared/middlewares/auth.middleware');
const { loginSchema, refreshSchema, changePasswordSchema } = require('./user.validator');

// POST /api/auth/login - 로그인
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/refresh - 토큰 갱신 (쿠키에서 refreshToken 읽음)
router.post('/refresh', authController.refresh);

// POST /api/auth/logout - 로그아웃 (쿠키 삭제)
router.post('/logout', authController.logout);

// GET /api/auth/me - 내 정보 조회 (인증 필요)
router.get('/me', authenticate, authController.me);

// PATCH /api/auth/change-password - 비밀번호 변경 (인증 필요)
router.patch('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
