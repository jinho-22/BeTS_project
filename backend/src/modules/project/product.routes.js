const router = require('express').Router();
const productController = require('./product.controller');
const { validate } = require('../../shared/middlewares/validation.middleware');
const { authenticate } = require('../../shared/middlewares/auth.middleware');
const { authorize } = require('../../shared/middlewares/rbac.middleware');
const { createProductSchema, updateProductSchema } = require('./product.validator');

// 모든 라우트에 인증 필요
router.use(authenticate);

// GET /api/products - 전체 제품 목록
router.get('/', productController.getAll);

// GET /api/products/grouped - 유형별 그룹핑 조회
router.get('/grouped', productController.getGrouped);

// GET /api/products/:id - 제품 상세
router.get('/:id', productController.getById);

// POST /api/products - 제품 생성 (관리자 전용)
router.post('/', authorize('admin'), validate(createProductSchema), productController.create);

// PUT /api/products/:id - 제품 수정 (관리자 전용)
router.put('/:id', authorize('admin'), validate(updateProductSchema), productController.update);

// DELETE /api/products/:id - 제품 삭제 (관리자)
router.delete('/:id', authorize('admin'), productController.delete);

module.exports = router;
