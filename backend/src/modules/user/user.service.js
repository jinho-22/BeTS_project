const AppError = require('../../shared/utils/AppError');
const { User, Department } = require('../../models');

class UserService {
  /**
   * 사용자 목록 조회 (페이징)
   */
  async findAll({ page = 1, limit = 20, dept_id, role, is_active }) {
    const offset = (page - 1) * limit;
    const where = {};

    if (dept_id) where.dept_id = dept_id;
    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active;

    return User.findAndCountAll({
      where,
      include: [{ model: Department, as: 'department' }],
      limit: parseInt(limit, 10),
      offset,
      order: [['user_id', 'ASC']],
    });
  }

  /**
   * 사용자 단일 조회
   */
  async findById(userId) {
    const user = await User.findByPk(userId, {
      include: [{ model: Department, as: 'department' }],
    });
    if (!user) {
      throw new AppError('사용자를 찾을 수 없습니다.', 404);
    }
    return user;
  }

  /**
   * 사용자 생성 (관리자 전용)
   */
  async create(userData) {
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      throw new AppError('이미 사용 중인 이메일입니다.', 409);
    }
    return User.create(userData);
  }

  /**
   * 사용자 정보 수정
   */
  async update(userId, updateData) {
    const user = await this.findById(userId);
    return user.update(updateData);
  }

  /**
   * 계정 비활성화 (퇴사 처리 - Soft Delete)
   */
  async deactivate(userId) {
    const user = await this.findById(userId);
    return user.update({ is_active: false });
  }

  /**
   * 계정 활성화
   */
  async activate(userId) {
    const user = await this.findById(userId);
    return user.update({ is_active: true });
  }

  /**
   * 부서 목록 조회
   */
  async getDepartments() {
    return Department.findAll({ order: [['dept_id', 'ASC']] });
  }

  /**
   * 부서 생성
   */
  async createDepartment(deptData) {
    return Department.create(deptData);
  }

  /**
   * 부서 수정
   */
  async updateDepartment(deptId, deptData) {
    const dept = await Department.findByPk(deptId);
    if (!dept) {
      throw new AppError('부서를 찾을 수 없습니다.', 404);
    }
    return dept.update(deptData);
  }

  /**
   * 부서 삭제 (소속 사용자가 없는 경우만)
   */
  async deleteDepartment(deptId) {
    const dept = await Department.findByPk(deptId);
    if (!dept) {
      throw new AppError('부서를 찾을 수 없습니다.', 404);
    }
    // 소속 사용자 확인
    const userCount = await User.count({ where: { dept_id: deptId } });
    if (userCount > 0) {
      throw new AppError(`해당 부서에 소속된 사용자(${userCount}명)가 있어 삭제할 수 없습니다.`, 400);
    }
    await dept.destroy();
  }
}

module.exports = new UserService();
