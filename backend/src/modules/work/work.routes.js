const router = require('express').Router();
const workController = require('./work.controller');
const { validate } = require('../../shared/middlewares/validation.middleware');
const { authenticate } = require('../../shared/middlewares/auth.middleware');
const { authorize } = require('../../shared/middlewares/rbac.middleware');
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

// GET /api/work/:id - 작업 로그 상세
router.get('/:id', workController.getById);

// PUT /api/work/:id - 작업 로그 수정
router.put('/:id', validate(updateWorkLogSchema), workController.update);

// PATCH /api/work/:id/status - 상태 변경 (관리자/매니저)
router.patch('/:id/status', authorize('admin', 'manager'), validate(changeStatusSchema), workController.changeStatus);

// DELETE /api/work/:id - 작업 로그 삭제
router.delete('/:id', workController.delete);

module.exports = router;
