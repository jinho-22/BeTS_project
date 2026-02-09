const AppError = require('../../shared/utils/AppError');
const { Client, Project, ManagerContact, Department, WorkLog } = require('../../models');

class ProjectService {
  // ════════════════════════════════════════
  // Client (고객사) 관리
  // ════════════════════════════════════════

  async findAllClients({ page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    return Client.findAndCountAll({
      where: { is_deleted: false },
      limit: parseInt(limit, 10),
      offset,
      order: [['client_id', 'ASC']],
      include: [{
        model: Project,
        as: 'projects',
        where: { is_deleted: false },
        required: false,
      }],
    });
  }

  async findClientById(clientId) {
    const client = await Client.findOne({
      where: { client_id: clientId, is_deleted: false },
      include: [{
        model: Project,
        as: 'projects',
        where: { is_deleted: false },
        required: false,
        include: [
          { model: ManagerContact, as: 'contacts' },
          { model: Department, as: 'department' },
        ],
      }],
    });
    if (!client) {
      throw new AppError('고객사를 찾을 수 없습니다.', 404);
    }
    return client;
  }

  async createClient(data) {
    return Client.create(data);
  }

  async updateClient(clientId, data) {
    const client = await this.findClientById(clientId);
    return client.update(data);
  }

  /**
   * 고객사 삭제 (Soft Delete)
   * 연관된 작업 로그가 있으면 삭제 불가
   */
  async deleteClient(clientId) {
    const client = await this.findClientById(clientId);

    // 연관된 프로젝트 확인
    const projects = await Project.findAll({
      where: { client_id: clientId, is_deleted: false },
    });

    for (const project of projects) {
      const workLogCount = await WorkLog.count({
        where: { project_id: project.project_id },
      });
      if (workLogCount > 0) {
        throw new AppError(
          `해당 고객사의 프로젝트(${project.project_name})에 작업 로그가 존재하여 삭제할 수 없습니다. 프로젝트를 먼저 정리해 주세요.`,
          400
        );
      }
    }

    // 연관 프로젝트도 함께 Soft Delete
    await Project.update({ is_deleted: true }, {
      where: { client_id: clientId },
    });

    return client.update({ is_deleted: true });
  }

  // ════════════════════════════════════════
  // Project (프로젝트) 관리
  // ════════════════════════════════════════

  async findAllProjects({ page = 1, limit = 20, client_id, dept_id }) {
    const offset = (page - 1) * limit;
    const where = { is_deleted: false };

    if (client_id) where.client_id = client_id;
    if (dept_id) where.dept_id = dept_id;

    return Project.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['project_id', 'ASC']],
      include: [
        { model: Client, as: 'client' },
        { model: Department, as: 'department' },
        { model: ManagerContact, as: 'contacts' },
      ],
    });
  }

  async findProjectById(projectId) {
    const project = await Project.findOne({
      where: { project_id: projectId, is_deleted: false },
      include: [
        { model: Client, as: 'client' },
        { model: Department, as: 'department' },
        { model: ManagerContact, as: 'contacts' },
      ],
    });
    if (!project) {
      throw new AppError('프로젝트를 찾을 수 없습니다.', 404);
    }
    return project;
  }

  async createProject(data) {
    // 고객사 존재 확인
    const client = await Client.findOne({
      where: { client_id: data.client_id, is_deleted: false },
    });
    if (!client) {
      throw new AppError('유효하지 않은 고객사 ID입니다.', 400);
    }
    return Project.create(data);
  }

  async updateProject(projectId, data) {
    const project = await this.findProjectById(projectId);
    return project.update(data);
  }

  /**
   * 프로젝트 삭제 (Soft Delete)
   * 연관된 작업 로그가 있으면 삭제 불가
   */
  async deleteProject(projectId) {
    const project = await this.findProjectById(projectId);

    const workLogCount = await WorkLog.count({
      where: { project_id: projectId },
    });
    if (workLogCount > 0) {
      throw new AppError('해당 프로젝트에 작업 로그가 존재하여 삭제할 수 없습니다.', 400);
    }

    return project.update({ is_deleted: true });
  }

  // ════════════════════════════════════════
  // ManagerContact (고객사 담당자) 관리
  // ════════════════════════════════════════

  async findContactsByProject(projectId) {
    await this.findProjectById(projectId); // 프로젝트 존재 확인
    return ManagerContact.findAll({
      where: { project_id: projectId },
      order: [['contact_id', 'ASC']],
    });
  }

  async createContact(data) {
    // 프로젝트 존재 확인
    await this.findProjectById(data.project_id);
    return ManagerContact.create(data);
  }

  async updateContact(contactId, data) {
    const contact = await ManagerContact.findByPk(contactId);
    if (!contact) {
      throw new AppError('담당자를 찾을 수 없습니다.', 404);
    }
    return contact.update(data);
  }

  async deleteContact(contactId) {
    const contact = await ManagerContact.findByPk(contactId);
    if (!contact) {
      throw new AppError('담당자를 찾을 수 없습니다.', 404);
    }

    // 연관된 작업 로그가 있는지 확인
    const workLogCount = await WorkLog.count({
      where: { contact_id: contactId },
    });
    if (workLogCount > 0) {
      throw new AppError('해당 담당자에 연관된 작업 로그가 존재하여 삭제할 수 없습니다.', 400);
    }

    return contact.destroy();
  }
}

module.exports = new ProjectService();
