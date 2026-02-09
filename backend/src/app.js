const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./shared/middlewares/error.middleware');

// 라우트 임포트
const authRoutes = require('./modules/user/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const projectRoutes = require('./modules/project/project.routes');
const productRoutes = require('./modules/project/product.routes');
const workRoutes = require('./modules/work/work.routes');

const app = express();

// ════════════════════════════════════════
// 글로벌 미들웨어
// ════════════════════════════════════════
app.use(helmet());
app.use(cors({
  origin: env.nodeEnv === 'development' ? 'http://localhost:5173' : process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 정적 파일 서빙 (업로드 파일)
app.use('/uploads', express.static(path.join(__dirname, '..', env.upload.dir)));

// ════════════════════════════════════════
// API 라우트
// ════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/products', productRoutes);
app.use('/api/work', workRoutes);

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
