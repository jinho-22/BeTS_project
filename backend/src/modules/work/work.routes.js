const router = require('express').Router();
const workController = require('./work.controller');
const fileController = require('./file.controller');
const { validate } = require('../../shared/middlewares/validation.middleware');
const { authenticate } = require('../../shared/middlewares/auth.middleware');
const { authorize } = require('../../shared/middlewares/rbac.middleware');
const { uploadMultiple, handleMulterError } = require('../../shared/middlewares/upload.middleware');
const {
  createWorkLogSchema,
  updateWorkLogSchema,
  changeStatusSchema,
  querySchema,
} = require('./work.validator');

// 모든 라우트에 인증 필요
router.use(authenticate);

// POST /api/work - 작업 로그 생성 (트랜잭션: WorkLog + Incident)
router.post('/', validate(createWorkLogSchema), workController.create);

// GET /api/work - 작업 로그 목록 (필터링/검색)
router.get('/', validate(querySchema), workController.getAll);

// GET /api/work/statistics - 기본 통계 (관리자/매니저)
router.get('/statistics', authorize('admin', 'manager'), workController.getStatistics);

// GET /api/work/statistics/detailed - 상세 통계 (관리자/매니저)
router.get('/statistics/detailed', authorize('admin', 'manager'), workController.getDetailedStatistics);

// ── 파일 라우트 (리터럴 경로 - :id 보다 위에 위치해야 함) ──
// GET /api/work/files/:fileId/download - 파일 다운로드
router.get('/files/:fileId/download', fileController.download);

// DELETE /api/work/files/:fileId - 파일 삭제
router.delete('/files/:fileId', fileController.delete);

// GET /api/work/:id - 작업 로그 상세
router.get('/:id', workController.getById);

// PUT /api/work/:id - 작업 로그 수정
router.put('/:id', validate(updateWorkLogSchema), workController.update);

// PATCH /api/work/:id/status - 상태 변경 (관리자/매니저)
router.patch('/:id/status', authorize('admin', 'manager'), validate(changeStatusSchema), workController.changeStatus);

// DELETE /api/work/:id - 작업 로그 삭제
router.delete('/:id', workController.delete);

// ── 파일 라우트 (중첩 경로 - :id 라우트 아래에 위치) ──
// POST /api/work/:logId/files - 파일 업로드
router.post('/:logId/files', uploadMultiple, handleMulterError, fileController.upload);

// GET /api/work/:logId/files - 작업 로그의 파일 목록
router.get('/:logId/files', fileController.getByLogId);

module.exports = router;
