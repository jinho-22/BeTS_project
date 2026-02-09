const projectService = require('./project.service');
const { sendSuccess, sendCreated, sendPaginated } = require('../../shared/utils/response');

class ProjectController {
  // ── Client ────────────────────────────
  async getAllClients(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await projectService.findAllClients({ page, limit });
      sendPaginated(res, result, page, limit, '고객사 목록 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async getClientById(req, res, next) {
    try {
      const client = await projectService.findClientById(req.params.id);
      sendSuccess(res, client, '고객사 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async createClient(req, res, next) {
    try {
      const client = await projectService.createClient(req.body);
      sendCreated(res, client, '고객사 생성 완료');
    } catch (error) {
      next(error);
    }
  }

  async updateClient(req, res, next) {
    try {
      const client = await projectService.updateClient(req.params.id, req.body);
      sendSuccess(res, client, '고객사 수정 완료');
    } catch (error) {
      next(error);
    }
  }

  async deleteClient(req, res, next) {
    try {
      await projectService.deleteClient(req.params.id);
      sendSuccess(res, null, '고객사 삭제 완료');
    } catch (error) {
      next(error);
    }
  }

  // ── Project ───────────────────────────
  async getAllProjects(req, res, next) {
    try {
      const { page = 1, limit = 20, client_id, dept_id } = req.query;
      const result = await projectService.findAllProjects({ page, limit, client_id, dept_id });
      sendPaginated(res, result, page, limit, '프로젝트 목록 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async getProjectById(req, res, next) {
    try {
      const project = await projectService.findProjectById(req.params.id);
      sendSuccess(res, project, '프로젝트 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async createProject(req, res, next) {
    try {
      const project = await projectService.createProject(req.body);
      sendCreated(res, project, '프로젝트 생성 완료');
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req, res, next) {
    try {
      const project = await projectService.updateProject(req.params.id, req.body);
      sendSuccess(res, project, '프로젝트 수정 완료');
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req, res, next) {
    try {
      await projectService.deleteProject(req.params.id);
      sendSuccess(res, null, '프로젝트 삭제 완료');
    } catch (error) {
      next(error);
    }
  }

  // ── Contact ───────────────────────────
  async getContactsByProject(req, res, next) {
    try {
      const contacts = await projectService.findContactsByProject(req.params.projectId);
      sendSuccess(res, contacts, '담당자 목록 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async createContact(req, res, next) {
    try {
      const contact = await projectService.createContact(req.body);
      sendCreated(res, contact, '담당자 생성 완료');
    } catch (error) {
      next(error);
    }
  }

  async updateContact(req, res, next) {
    try {
      const contact = await projectService.updateContact(req.params.id, req.body);
      sendSuccess(res, contact, '담당자 수정 완료');
    } catch (error) {
      next(error);
    }
  }

  async deleteContact(req, res, next) {
    try {
      await projectService.deleteContact(req.params.id);
      sendSuccess(res, null, '담당자 삭제 완료');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProjectController();
