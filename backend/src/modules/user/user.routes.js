const router = require('express').Router();
const userController = require('./user.controller');
const { validate } = require('../../shared/middlewares/validation.middleware');
const { authenticate } = require('../../shared/middlewares/auth.middleware');
const { authorize } = require('../../shared/middlewares/rbac.middleware');
const { createUserSchema, updateUserSchema, createDepartmentSchema, updateDepartmentSchema } = require('./user.validator');

// 모든 라우트에 인증 필요
router.use(authenticate);

// ── 부서 관리 ────────────────────────────
// GET /api/users/departments - 부서 목록
router.get('/departments', userController.getDepartments);

// POST /api/users/departments - 부서 생성 (관리자 전용)
router.post('/departments', authorize('admin'), validate(createDepartmentSchema), userController.createDepartment);

// PUT /api/users/departments/:id - 부서 수정 (관리자 전용)
router.put('/departments/:id', authorize('admin'), validate(updateDepartmentSchema), userController.updateDepartment);

// DELETE /api/users/departments/:id - 부서 삭제 (관리자 전용)
router.delete('/departments/:id', authorize('admin'), userController.deleteDepartment);

// ── 사용자 관리 ──────────────────────────
// GET /api/users - 사용자 목록 (관리자 전용)
router.get('/', authorize('admin'), userController.getAll);

// GET /api/users/:id - 사용자 상세 조회 (관리자 전용)
router.get('/:id', authorize('admin'), userController.getById);

// POST /api/users - 사용자 생성 (관리자 전용)
router.post('/', authorize('admin'), validate(createUserSchema), userController.create);

// PUT /api/users/:id - 사용자 수정 (관리자 전용)
router.put('/:id', authorize('admin'), validate(updateUserSchema), userController.update);

// PATCH /api/users/:id/deactivate - 퇴사 처리
router.patch('/:id/deactivate', authorize('admin'), userController.deactivate);

// PATCH /api/users/:id/activate - 계정 활성화
router.patch('/:id/activate', authorize('admin'), userController.activate);

module.exports = router;
