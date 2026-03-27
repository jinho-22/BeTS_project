const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./shared/middlewares/error.middleware');

// 라우트 임포트
const authRoutes = require('./modules/user/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const projectRoutes = require('./modules/project/project.routes');
const productRoutes = require('./modules/project/product.routes');
const workRoutes = require('./modules/work/work.routes');
const notificationRoutes = require('./modules/notification/notification.routes');
const setupRoutes = require('./modules/setup/setup.routes');

const app = express();

// ════════════════════════════════════════
// 글로벌 미들웨어
// ════════════════════════════════════════
app.use(helmet());
app.use(cors({
  origin: env.nodeEnv === 'development' ? ['http://localhost:5173', 'http://localhost:5174'] : process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// [보안] 업로드 파일은 /api/work/files/:fileId/download (인증 필수)를 통해서만 접근 가능
// express.static('/uploads') 제거 — 파일명만으로 무인증 접근 방지

// ════════════════════════════════════════
// Rate Limiting (Brute Force / DoS 방지)
// ════════════════════════════════════════
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = res.getHeader('Retry-After');
    const remainingSeconds = retryAfter ? parseInt(retryAfter, 10) : 300;
    res.status(429).json({
      success: false,
      message: '너무 많은 로그인 시도입니다.',
      retryAfterSeconds: remainingSeconds,
    });
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
  },
});

// ════════════════════════════════════════
// API 라우트
// ════════════════════════════════════════
app.use('/api/auth/login', loginLimiter);
app.use('/api/', apiLimiter);

// 관리자 전용: 로그인 Rate Limit 해제
const { authenticate } = require('./shared/middlewares/auth.middleware');
app.post('/api/auth/unlock', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, message: 'IP 주소가 필요합니다.' });
  }
  await loginLimiter.resetKey(ip);
  res.json({ success: true, message: `${ip}의 로그인 제한이 해제되었습니다.` });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/products', productRoutes);
app.use('/api/work', workRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/setup', setupRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'BeTS Work Log System API is running',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ════════════════════════════════════════
// 에러 핸들링
// ════════════════════════════════════════
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
