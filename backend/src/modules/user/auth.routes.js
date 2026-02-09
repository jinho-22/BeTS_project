const router = require('express').Router();
const authController = require('./auth.controller');
const { validate } = require('../../shared/middlewares/validation.middleware');
const { authenticate } = require('../../shared/middlewares/auth.middleware');
const { loginSchema, refreshSchema } = require('./user.validator');

// POST /api/auth/login - 로그인
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/refresh - 토큰 갱신
router.post('/refresh', validate(refreshSchema), authController.refresh);

// GET /api/auth/me - 내 정보 조회 (인증 필요)
router.get('/me', authenticate, authController.me);

module.exports = router;
