const workService = require('./work.service');
const { sendSuccess, sendCreated, sendPaginated } = require('../../shared/utils/response');

class WorkController {
  async create(req, res, next) {
    try {
      const { incident, ...workData } = req.body;
      const result = await workService.create(workData, incident || null, req.user.user_id);
      sendCreated(res, result, '작업 로그 생성 완료');
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const {
        page = 1, limit = 20,
        user_id, project_id, work_type, status,
        start_date, end_date, keyword,
      } = req.query;

      const result = await workService.findAll({
        page, limit, user_id, project_id, work_type, status,
        start_date, end_date, keyword,
      });
      sendPaginated(res, result, page, limit, '작업 로그 목록 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const result = await workService.findById(req.params.id);
      sendSuccess(res, result, '작업 로그 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { incident, ...workData } = req.body;
      const result = await workService.update(
        req.params.id, workData, incident || null, req.user.user_id
      );
      sendSuccess(res, result, '작업 로그 수정 완료');
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await workService.changeStatus(req.params.id, status, req.user.user_id);
      sendSuccess(res, result, '상태 변경 완료');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await workService.delete(req.params.id);
      sendSuccess(res, null, '작업 로그 삭제 완료');
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const result = await workService.getStatistics({ start_date, end_date });
      sendSuccess(res, result, '통계 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async getDetailedStatistics(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const result = await workService.getDetailedStatistics({ start_date, end_date });
      sendSuccess(res, result, '상세 통계 조회 성공');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WorkController();
