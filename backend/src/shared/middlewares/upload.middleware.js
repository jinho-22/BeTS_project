const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const env = require('../../config/env');
const AppError = require('../utils/AppError');

// 업로드 디렉토리 확보
const uploadDir = path.join(__dirname, '..', '..', '..', env.upload.dir);
fs.mkdirSync(uploadDir, { recursive: true });

// 허용 확장자
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.log',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg',
  '.zip', '.7z', '.rar', '.tar', '.gz',
]);

// 디스크 스토리지 설정
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// 파일 필터 (확장자 검사)
const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(`허용되지 않는 파일 형식입니다: ${ext}`, 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.upload.maxFileSize },
});

// 다중 파일 업로드 (최대 5개)
const uploadMultiple = upload.array('files', 5);

// Multer 에러 → AppError 변환 미들웨어
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('파일 크기가 10MB를 초과합니다.', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('한 번에 최대 5개 파일까지 업로드할 수 있습니다.', 400));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('허용되지 않는 파일 필드입니다.', 400));
    }
    return next(new AppError(`파일 업로드 오류: ${err.message}`, 400));
  }
  next(err);
};

module.exports = { uploadMultiple, handleMulterError };
