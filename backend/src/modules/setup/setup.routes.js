const router = require('express').Router();
const { sendSuccess } = require('../../shared/utils/response');
const { User, Department, Product } = require('../../models');
const sequelize = require('../../config/database');

/**
 * GET /api/setup/status
 * 시스템 초기 설정 여부 확인 (인증 불필요)
 */
router.get('/status', async (req, res, next) => {
  try {
    const userCount = await User.count();
    sendSuccess(res, {
      initialized: userCount > 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/setup/initialize
 * 초기 설정 실행 (사용자가 0명일 때만 동작)
 *
 * body: {
 *   admin: { email, name, password, position },
 *   departments: ['부서1', '부서2', ...],
 *   products: [{ product_type, product_name }, ...]  // 선택
 * }
 */
router.post('/initialize', async (req, res, next) => {
  try {
    // 이미 초기화된 경우 거부
    const userCount = await User.count();
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: '이미 초기 설정이 완료된 시스템입니다.',
      });
    }

    const { admin, departments, products } = req.body;

    // 필수 항목 검증
    if (!admin?.email || !admin?.name || !admin?.password) {
      return res.status(400).json({
        success: false,
        message: '관리자 이메일, 이름, 비밀번호는 필수입니다.',
      });
    }

    if (!departments || departments.length === 0) {
      return res.status(400).json({
        success: false,
        message: '최소 1개 이상의 부서를 입력해주세요.',
      });
    }

    // 트랜잭션으로 일괄 처리
    const result = await sequelize.transaction(async (t) => {
      // 1. 부서 생성
      const createdDepts = await Department.bulkCreate(
        departments.map((name) => ({ dept_name: name })),
        { transaction: t }
      );

      // 2. 관리자 계정 생성 (첫 번째 부서에 소속)
      const adminUser = await User.create({
        email: admin.email,
        name: admin.name,
        password: admin.password,
        position: admin.position || '관리자',
        dept_id: createdDepts[0].dept_id,
        role: 'admin',
        is_active: true,
      }, { transaction: t });

      // 3. 제품 마스터 생성 (입력된 경우)
      let productCount = 0;
      if (products && products.length > 0) {
        await Product.bulkCreate(
          products.map((p) => ({
            product_type: p.product_type,
            product_name: p.product_name,
          })),
          { transaction: t }
        );
        productCount = products.length;
      }

      // 4. log_id_sequences 초기화
      await sequelize.query(
        `INSERT IGNORE INTO log_id_sequences (work_type, current_max) VALUES
          ('정기점검', 100000), ('장애지원', 300000), ('기술지원', 500000),
          ('프로젝트 지원', 700000), ('기타', 900000)`,
        { transaction: t }
      );

      return {
        admin: { email: adminUser.email, name: adminUser.name },
        departmentCount: createdDepts.length,
        productCount,
      };
    });

    sendSuccess(res, result, '초기 설정이 완료되었습니다.');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
