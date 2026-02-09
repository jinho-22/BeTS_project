const userService = require('./user.service');
const { sendSuccess, sendCreated, sendPaginated } = require('../../shared/utils/response');

class UserController {
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, dept_id, role, is_active } = req.query;
      const result = await userService.findAll({ page, limit, dept_id, role, is_active });
      sendPaginated(res, result, page, limit, '사용자 목록 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);
      sendSuccess(res, user, '사용자 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const user = await userService.create(req.body);
      sendCreated(res, user, '사용자 생성 완료');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.body);
      sendSuccess(res, user, '사용자 수정 완료');
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req, res, next) {
    try {
      await userService.deactivate(req.params.id);
      sendSuccess(res, null, '계정 비활성화 완료');
    } catch (error) {
      next(error);
    }
  }

  async activate(req, res, next) {
    try {
      await userService.activate(req.params.id);
      sendSuccess(res, null, '계정 활성화 완료');
    } catch (error) {
      next(error);
    }
  }

  async getDepartments(req, res, next) {
    try {
      const departments = await userService.getDepartments();
      sendSuccess(res, departments, '부서 목록 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async createDepartment(req, res, next) {
    try {
      const department = await userService.createDepartment(req.body);
      sendCreated(res, department, '부서 생성 완료');
    } catch (error) {
      next(error);
    }
  }

  async updateDepartment(req, res, next) {
    try {
      const department = await userService.updateDepartment(req.params.id, req.body);
      sendSuccess(res, department, '부서 수정 완료');
    } catch (error) {
      next(error);
    }
  }

  async deleteDepartment(req, res, next) {
    try {
      await userService.deleteDepartment(req.params.id);
      sendSuccess(res, null, '부서 삭제 완료');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
