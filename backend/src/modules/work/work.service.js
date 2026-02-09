const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const AppError = require('../../shared/utils/AppError');
const {
  WorkLog, Incident, FileUpload, User, Project, Client, ManagerContact, Department,
} = require('../../models');

// 장애 관련 작업 유형
const INCIDENT_WORK_TYPES = ['장애지원', '장애처리', '장애대응'];

// 상태 전이 규칙
const STATUS_TRANSITIONS = {
  '등록': ['관리자확인'],
  '관리자확인': ['승인완료', '등록'], // 반려 시 등록으로 돌아감
  '승인완료': [],
};

class WorkService {
  /**
   * 작업 로그 생성 (트랜잭션 적용)
   * 장애 관련 작업의 경우 Incident도 함께 생성
   */
  async create(workData, incidentData, userId) {
    const transaction = await sequelize.transaction();

    try {
      // 1. 장애 관련 작업 유형 검증
      if (INCIDENT_WORK_TYPES.includes(workData.work_type)) {
        if (!incidentData) {
          throw new AppError('장애 관련 작업 유형에는 장애 상세 정보가 필수입니다.', 400);
        }
        if (!incidentData.severity || !incidentData.cause_type) {
          throw new AppError('장애 상세의 영향도(severity)와 원인분류(cause_type)는 필수입니다.', 400);
        }
      }

      // 2. WorkLog 생성
      const workLog = await WorkLog.create(
        { ...workData, user_id: userId, status: '등록' },
        { transaction }
      );

      // 3. 장애 내역 생성 (장애 관련 작업일 경우)
      let incident = null;
      if (incidentData) {
        incident = await Incident.create(
          { ...incidentData, log_id: workLog.log_id },
          { transaction }
        );
        await workLog.update(
          { incident_id: incident.incident_id },
          { transaction }
        );
      }

      await transaction.commit();

      // 생성된 데이터 반환
      return this.findById(workLog.log_id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 작업 로그 목록 조회 (필터링/검색/페이징)
   */
  async findAll({ page = 1, limit = 20, user_id, project_id, work_type, status, product_type, start_date, end_date, keyword }) {
    const offset = (page - 1) * limit;
    const where = {};

    if (user_id) where.user_id = user_id;
    if (project_id) where.project_id = project_id;
    if (work_type) where.work_type = work_type;
    if (status) where.status = status;
    if (product_type) where.product_type = product_type;

    // 날짜 필터 (end_date는 해당일 끝까지 포함)
    if (start_date && end_date) {
      const endDateFull = new Date(end_date);
      endDateFull.setHours(23, 59, 59, 999);
      where.work_start = {
        [Op.between]: [new Date(start_date), endDateFull],
      };
    } else if (start_date) {
      where.work_start = { [Op.gte]: new Date(start_date) };
    } else if (end_date) {
      const endDateFull = new Date(end_date);
      endDateFull.setHours(23, 59, 59, 999);
      where.work_start = { [Op.lte]: endDateFull };
    }

    // 키워드 검색
    if (keyword) {
      where.details = { [Op.like]: `%${keyword}%` };
    }

    return WorkLog.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['work_start', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'name', 'email', 'position'] },
        {
          model: Project, as: 'project',
          include: [{ model: Client, as: 'client' }],
        },
        { model: ManagerContact, as: 'contact' },
        { model: Incident, as: 'incident' },
        { model: FileUpload, as: 'files' },
      ],
    });
  }

  /**
   * 작업 로그 단건 조회
   */
  async findById(logId) {
    const workLog = await WorkLog.findByPk(logId, {
      include: [
        {
          model: User, as: 'user',
          attributes: ['user_id', 'name', 'email', 'position'],
          include: [{ model: Department, as: 'department' }],
        },
        {
          model: Project, as: 'project',
          include: [{ model: Client, as: 'client' }],
        },
        { model: ManagerContact, as: 'contact' },
        { model: Incident, as: 'incident' },
        { model: FileUpload, as: 'files' },
      ],
    });

    if (!workLog) {
      throw new AppError('작업 로그를 찾을 수 없습니다.', 404);
    }
    return workLog;
  }

  /**
   * 작업 로그 수정 (트랜잭션 적용)
   */
  async update(logId, workData, incidentData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const workLog = await WorkLog.findByPk(logId, { transaction });

      if (!workLog) {
        throw new AppError('작업 로그를 찾을 수 없습니다.', 404);
      }

      // 본인 작성 또는 관리자만 수정 가능 (컨트롤러에서 처리)

      // 1. 장애 관련 작업 유형 검증
      const workType = workData.work_type || workLog.work_type;
      if (INCIDENT_WORK_TYPES.includes(workType) && incidentData) {
        if (!incidentData.severity || !incidentData.cause_type) {
          throw new AppError('장애 상세의 영향도(severity)와 원인분류(cause_type)는 필수입니다.', 400);
        }
      }

      // 2. WorkLog 수정
      await workLog.update(workData, { transaction });

      // 3. 장애 내역 수정
      if (incidentData) {
        if (workLog.incident_id) {
          // 기존 장애 내역 수정
          await Incident.update(incidentData, {
            where: { incident_id: workLog.incident_id },
            transaction,
          });
        } else {
          // 새 장애 내역 생성
          const incident = await Incident.create(
            { ...incidentData, log_id: logId },
            { transaction }
          );
          await workLog.update(
            { incident_id: incident.incident_id },
            { transaction }
          );
        }
      }

      await transaction.commit();
      return this.findById(logId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 상태 변경 (상태 머신 적용)
   * 등록 -> 관리자확인 -> 승인완료
   */
  async changeStatus(logId, newStatus, userId) {
    const workLog = await WorkLog.findByPk(logId);

    if (!workLog) {
      throw new AppError('작업 로그를 찾을 수 없습니다.', 404);
    }

    const currentStatus = workLog.status;
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new AppError(
        `'${currentStatus}' 상태에서 '${newStatus}' 상태로 변경할 수 없습니다. 허용 전이: [${allowedTransitions?.join(', ') || '없음'}]`,
        400
      );
    }

    return workLog.update({ status: newStatus });
  }

  /**
   * 작업 로그 삭제 (등록 상태일 때만 가능)
   */
  async delete(logId) {
    const workLog = await WorkLog.findByPk(logId);

    if (!workLog) {
      throw new AppError('작업 로그를 찾을 수 없습니다.', 404);
    }

    if (workLog.status !== '등록') {
      throw new AppError('등록 상태의 작업 로그만 삭제할 수 있습니다.', 400);
    }

    const transaction = await sequelize.transaction();
    try {
      // 연관 장애 내역 삭제
      if (workLog.incident_id) {
        await Incident.destroy({
          where: { incident_id: workLog.incident_id },
          transaction,
        });
      }

      // 연관 파일 삭제
      await FileUpload.destroy({
        where: { log_id: logId },
        transaction,
      });

      await workLog.destroy({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 통계 조회 (기본 - 대시보드용)
   */
  async getStatistics({ start_date, end_date }) {
    const where = {};
    if (start_date && end_date) {
      const endDateFull = new Date(end_date);
      endDateFull.setHours(23, 59, 59, 999);
      where.work_start = {
        [Op.between]: [new Date(start_date), endDateFull],
      };
    } else if (start_date) {
      where.work_start = { [Op.gte]: new Date(start_date) };
    } else if (end_date) {
      const endDateFull = new Date(end_date);
      endDateFull.setHours(23, 59, 59, 999);
      where.work_start = { [Op.lte]: endDateFull };
    }

    const [totalCount, byStatusRaw, byWorkTypeRaw, byUserRaw] = await Promise.all([
      WorkLog.count({ where }),
      WorkLog.findAll({
        where,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('WorkLog.status')), 'count'],
        ],
        group: ['WorkLog.status'],
        raw: true,
      }),
      WorkLog.findAll({
        where,
        attributes: [
          'work_type',
          [sequelize.fn('COUNT', sequelize.col('WorkLog.work_type')), 'count'],
        ],
        group: ['WorkLog.work_type'],
        raw: true,
      }),
      WorkLog.findAll({
        where,
        attributes: [
          [sequelize.col('WorkLog.user_id'), 'user_id'],
          [sequelize.fn('COUNT', sequelize.col('WorkLog.user_id')), 'count'],
        ],
        group: ['WorkLog.user_id'],
        include: [{ model: User, as: 'user', attributes: ['name'] }],
        raw: true,
      }),
    ]);

    const toNumber = (val) => (typeof val === 'bigint' ? Number(val) : Number(val) || 0);
    const byStatus = byStatusRaw.map(r => ({ ...r, count: toNumber(r.count) }));
    const byWorkType = byWorkTypeRaw.map(r => ({ ...r, count: toNumber(r.count) }));
    const byUser = byUserRaw.map(r => ({ ...r, count: toNumber(r.count) }));

    return { totalCount: toNumber(totalCount), byStatus, byWorkType, byUser };
  }

  /**
   * 상세 통계 조회 (통계 페이지용)
   * 엔지니어별, 부서별, 고객사별 작업유형 교차 통계 + 장애 상세
   */
  async getDetailedStatistics({ start_date, end_date }) {
    // 날짜 조건 생성
    let dateCondition = '';
    const replacements = {};
    if (start_date && end_date) {
      const endFull = new Date(end_date);
      endFull.setHours(23, 59, 59, 999);
      dateCondition = 'AND w.work_start BETWEEN :startDate AND :endDate';
      replacements.startDate = new Date(start_date);
      replacements.endDate = endFull;
    } else if (start_date) {
      dateCondition = 'AND w.work_start >= :startDate';
      replacements.startDate = new Date(start_date);
    } else if (end_date) {
      const endFull = new Date(end_date);
      endFull.setHours(23, 59, 59, 999);
      dateCondition = 'AND w.work_start <= :endDate';
      replacements.endDate = endFull;
    }

    const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v) || 0);

    // ── 1. 개요 통계 ──────────────────────
    const [overviewRows] = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = '등록' THEN 1 ELSE 0 END) as status_registered,
        SUM(CASE WHEN status = '관리자확인' THEN 1 ELSE 0 END) as status_checked,
        SUM(CASE WHEN status = '승인완료' THEN 1 ELSE 0 END) as status_approved,
        SUM(CASE WHEN work_type = '정기점검' THEN 1 ELSE 0 END) as type_regular,
        SUM(CASE WHEN work_type IN ('장애지원','장애처리','장애대응') THEN 1 ELSE 0 END) as type_incident,
        SUM(CASE WHEN work_type = '기술지원' THEN 1 ELSE 0 END) as type_tech,
        SUM(CASE WHEN work_type = '교육' THEN 1 ELSE 0 END) as type_training,
        SUM(CASE WHEN work_type = '기타' THEN 1 ELSE 0 END) as type_etc
      FROM work_log w
      WHERE 1=1 ${dateCondition}
    `, { replacements, type: sequelize.QueryTypes.SELECT });

    const overview = overviewRows ? Object.fromEntries(
      Object.entries(overviewRows).map(([k, v]) => [k, toNum(v)])
    ) : {};

    const queryOpts = { replacements, type: sequelize.QueryTypes.SELECT };

    // ── 2. 엔지니어별 통계 ──────────────────
    const byEngineerRaw = await sequelize.query(`
      SELECT
        u.user_id, u.name as user_name, u.position,
        d.dept_name,
        COUNT(*) as total,
        SUM(CASE WHEN w.work_type = '정기점검' THEN 1 ELSE 0 END) as regular_check,
        SUM(CASE WHEN w.work_type IN ('장애지원','장애처리','장애대응') THEN 1 ELSE 0 END) as incident_support,
        SUM(CASE WHEN w.work_type = '기술지원' THEN 1 ELSE 0 END) as tech_support,
        SUM(CASE WHEN w.work_type = '교육' THEN 1 ELSE 0 END) as training,
        SUM(CASE WHEN w.work_type = '기타' THEN 1 ELSE 0 END) as etc_work,
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end)) / 60, 1) as total_hours
      FROM work_log w
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN departments d ON u.dept_id = d.dept_id
      WHERE 1=1 ${dateCondition}
      GROUP BY u.user_id, u.name, u.position, d.dept_name
      ORDER BY total DESC
    `, queryOpts);

    const byEngineer = byEngineerRaw.map(r => Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, typeof v === 'string' || v === null ? v : toNum(v)])
    ));

    // ── 3. 부서별 통계 ──────────────────────
    const byDepartmentRaw = await sequelize.query(`
      SELECT
        d.dept_id, d.dept_name,
        COUNT(*) as total,
        COUNT(DISTINCT w.user_id) as engineer_count,
        SUM(CASE WHEN w.work_type = '정기점검' THEN 1 ELSE 0 END) as regular_check,
        SUM(CASE WHEN w.work_type IN ('장애지원','장애처리','장애대응') THEN 1 ELSE 0 END) as incident_support,
        SUM(CASE WHEN w.work_type = '기술지원' THEN 1 ELSE 0 END) as tech_support,
        SUM(CASE WHEN w.work_type = '교육' THEN 1 ELSE 0 END) as training,
        SUM(CASE WHEN w.work_type = '기타' THEN 1 ELSE 0 END) as etc_work,
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end)) / 60, 1) as total_hours
      FROM work_log w
      JOIN users u ON w.user_id = u.user_id
      JOIN departments d ON u.dept_id = d.dept_id
      WHERE 1=1 ${dateCondition}
      GROUP BY d.dept_id, d.dept_name
      ORDER BY total DESC
    `, queryOpts);

    const byDepartment = byDepartmentRaw.map(r => Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, typeof v === 'string' || v === null ? v : toNum(v)])
    ));

    // ── 4. 고객사별 통계 ──────────────────────
    const byClientRaw = await sequelize.query(`
      SELECT
        c.client_id, c.client_name,
        COUNT(*) as total,
        SUM(CASE WHEN w.work_type = '정기점검' THEN 1 ELSE 0 END) as regular_check,
        SUM(CASE WHEN w.work_type IN ('장애지원','장애처리','장애대응') THEN 1 ELSE 0 END) as incident_support,
        SUM(CASE WHEN w.work_type = '기술지원' THEN 1 ELSE 0 END) as tech_support,
        SUM(CASE WHEN w.work_type = '교육' THEN 1 ELSE 0 END) as training,
        SUM(CASE WHEN w.work_type = '기타' THEN 1 ELSE 0 END) as etc_work,
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end)) / 60, 1) as total_hours
      FROM work_log w
      JOIN projects p ON w.project_id = p.project_id
      JOIN client c ON p.client_id = c.client_id
      WHERE 1=1 ${dateCondition}
      GROUP BY c.client_id, c.client_name
      ORDER BY total DESC
    `, queryOpts);

    const byClient = byClientRaw.map(r => Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, typeof v === 'string' || v === null ? v : toNum(v)])
    ));

    // ── 5. 고객사별 장애 상세 (영향도, 원인분류) ──────
    const clientIncidentRaw = await sequelize.query(`
      SELECT
        c.client_id, c.client_name,
        i.severity, i.cause_type,
        COUNT(*) as cnt,
        SUM(CASE WHEN i.is_recurrence = 'Y' THEN 1 ELSE 0 END) as recurrence_count
      FROM incidents i
      JOIN work_log w ON i.log_id = w.log_id
      JOIN projects p ON w.project_id = p.project_id
      JOIN client c ON p.client_id = c.client_id
      WHERE 1=1 ${dateCondition}
      GROUP BY c.client_id, c.client_name, i.severity, i.cause_type
      ORDER BY c.client_name, cnt DESC
    `, queryOpts);

    // 고객사별 장애 데이터 그룹핑
    const clientIncidents = {};
    clientIncidentRaw.forEach(row => {
      const cid = row.client_id;
      if (!clientIncidents[cid]) {
        clientIncidents[cid] = { client_id: cid, client_name: row.client_name, incidents: [] };
      }
      clientIncidents[cid].incidents.push({
        severity: row.severity,
        cause_type: row.cause_type,
        count: toNum(row.cnt),
        recurrence_count: toNum(row.recurrence_count),
      });
    });

    // ── 6. 월별 추이 (최근 6개월) ──────────────────
    const monthlyTrendRaw = await sequelize.query(`
      SELECT
        DATE_FORMAT(w.work_start, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN w.work_type = '정기점검' THEN 1 ELSE 0 END) as regular_check,
        SUM(CASE WHEN w.work_type IN ('장애지원','장애처리','장애대응') THEN 1 ELSE 0 END) as incident_support,
        SUM(CASE WHEN w.work_type = '기술지원' THEN 1 ELSE 0 END) as tech_support
      FROM work_log w
      WHERE w.work_start >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(w.work_start, '%Y-%m')
      ORDER BY month ASC
    `, { type: sequelize.QueryTypes.SELECT });

    const monthlyTrend = monthlyTrendRaw.map(r => ({
      month: r.month,
      total: toNum(r.total),
      regular_check: toNum(r.regular_check),
      incident_support: toNum(r.incident_support),
      tech_support: toNum(r.tech_support),
    }));

    return {
      overview,
      byEngineer,
      byDepartment,
      byClient,
      clientIncidents: Object.values(clientIncidents),
      monthlyTrend,
    };
  }
}

module.exports = new WorkService();
