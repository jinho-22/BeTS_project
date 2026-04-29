const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const AppError = require('../../shared/utils/AppError');
const {
  WorkLog, Incident, FileUpload, User, Project, Client, ManagerContact, Department, WorkLogComment, Notification,
} = require('../../models');

// 장애 관련 작업 유형
const INCIDENT_WORK_TYPES = ['장애지원'];

// work_type별 log_id 기준값 매핑
const WORK_TYPE_BASE = {
  '정기점검': 100000,
  '장애지원': 300000,
  '기술지원': 500000,
  '프로젝트 지원': 700000,
  '기타': 900000,
};

// 각 work_type별 log_id 최대 범위
const WORK_TYPE_MAX = {
  '정기점검': 199999,
  '장애지원': 399999,
  '기술지원': 599999,
  '프로젝트 지원': 799999,
  '기타': 999999,
};

// 상태 전이 규칙
const STATUS_TRANSITIONS = {
  '등록': ['관리자확인'],
  '관리자확인': ['승인완료', '등록'], // 반려 시 등록으로 돌아감
  '승인완료': [],
};

class WorkService {
  /**
   * 작업 유형별 다음 log_id를 원자적으로 생성
   * SELECT ... FOR UPDATE로 동시성 제어
   */
  async _generateNextLogId(workType, transaction) {
    const max = WORK_TYPE_MAX[workType];
    if (max === undefined) {
      throw new AppError(`알 수 없는 작업 유형: ${workType}`, 400);
    }

    // FOR UPDATE 행 잠금으로 동시성 제어
    const results = await sequelize.query(
      `SELECT current_max FROM log_id_sequences WHERE work_type = :workType FOR UPDATE`,
      {
        replacements: { workType },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!results || results.length === 0) {
      throw new AppError(`시퀀스 초기화 오류: ${workType}`, 500);
    }

    const nextId = results[0].current_max + 1;

    if (nextId > max) {
      throw new AppError(
        `'${workType}' 작업 유형의 ID 범위가 소진되었습니다. (최대: ${max})`,
        500
      );
    }

    // 카운터 증가
    await sequelize.query(
      `UPDATE log_id_sequences SET current_max = :nextId WHERE work_type = :workType`,
      {
        replacements: { nextId, workType },
        transaction,
      }
    );

    return nextId;
  }

  /**
   * 작업 로그 생성 (트랜잭션 적용)
   * 장애 관련 작업의 경우 Incident도 함께 생성
   */
  async create(workData, incidentData, userId) {
    const transaction = await sequelize.transaction();

    try {
      // sub_work_type: 배열이면 콤마 문자열로 변환
      if (Array.isArray(workData.sub_work_type)) {
        workData.sub_work_type = workData.sub_work_type.filter(Boolean).join(',') || null;
      }

      // 1. 장애 관련 작업 유형 검증 (주 유형 또는 부 유형에 장애지원 포함 시)
      const allTypes = [workData.work_type, ...(workData.sub_work_type || '').split(',')].filter(Boolean);
      const hasIncident = allTypes.some(t => INCIDENT_WORK_TYPES.includes(t));
      if (hasIncident) {
        if (!incidentData) {
          throw new AppError('장애 관련 작업 유형에는 장애 상세 정보가 필수입니다.', 400);
        }
        if (!incidentData.severity || !incidentData.cause_type) {
          throw new AppError('장애 상세의 영향도(severity)와 원인분류(cause_type)는 필수입니다.', 400);
        }
      }

      // 2. 작업 유형별 다음 log_id 생성 (원자적)
      const nextLogId = await this._generateNextLogId(workData.work_type, transaction);

      // 3. WorkLog 생성 (log_id 명시)
      const workLog = await WorkLog.create(
        { ...workData, log_id: nextLogId, user_id: userId, status: '등록' },
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
  async findAll({ page = 1, limit = 20, user_id, project_id, dept_id, work_type, status, product_type, start_date, end_date, keyword, is_recurrence }) {
    const offset = (page - 1) * limit;
    const where = {};

    if (user_id) where.user_id = user_id;
    if (project_id) where.project_id = project_id;
    if (work_type) where.work_type = work_type;
    if (status) where.status = status;
    if (product_type) where.product_type = product_type;

    // 날짜 필터 (검증된 헬퍼 사용)
    Object.assign(where, this._buildDateWhere(start_date, end_date));

    // 키워드 검색
    if (keyword) {
      where.details = { [Op.like]: `%${keyword}%` };
    }

    // 부서 필터링을 위한 프로젝트 include 조건
    const projectInclude = {
      model: Project, as: 'project',
      include: [{ model: Client, as: 'client' }],
    };
    if (dept_id) {
      projectInclude.where = { dept_id };
      projectInclude.required = true;
    }

    // 장애 재발여부 필터
    const incidentInclude = { model: Incident, as: 'incident' };
    if (is_recurrence) {
      incidentInclude.where = { is_recurrence };
      incidentInclude.required = true;
    }

    return WorkLog.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['work_start', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'name', 'email', 'position'] },
        projectInclude,
        { model: ManagerContact, as: 'contact' },
        incidentInclude,
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
        {
          model: WorkLogComment, as: 'comments',
          include: [{ model: User, as: 'author', attributes: ['user_id', 'name'] }],
          order: [['created_at', 'DESC']],
        },
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
  async update(logId, workData, incidentData, userId, userRole) {
    const transaction = await sequelize.transaction();

    try {
      const workLog = await WorkLog.findByPk(logId, { transaction });

      if (!workLog) {
        throw new AppError('작업 로그를 찾을 수 없습니다.', 404);
      }

      // 소유권 검증: 관리자/매니저가 아니면 본인 작성분만 수정 가능
      if (workLog.user_id !== userId && !['admin', 'manager'].includes(userRole)) {
        throw new AppError('본인의 작업 내역만 수정할 수 있습니다.', 403);
      }

      // 0. 작업 유형 변경 방지 (log_id 번호 체계와 연동되므로 변경 불가)
      if (workData.work_type && workData.work_type !== workLog.work_type) {
        throw new AppError('작업 유형은 생성 후 변경할 수 없습니다. 삭제 후 재등록해 주세요.', 400);
      }

      // sub_work_type: 배열이면 콤마 문자열로 변환
      if (Array.isArray(workData.sub_work_type)) {
        workData.sub_work_type = workData.sub_work_type.filter(Boolean).join(',') || null;
      }

      // 1. 장애 관련 작업 유형 검증 (주 유형 또는 부 유형에 장애지원 포함 시)
      const workType = workData.work_type || workLog.work_type;
      const subTypes = (workData.sub_work_type || workLog.sub_work_type || '').split(',').filter(Boolean);
      const allTypes = [workType, ...subTypes];
      const hasIncident = allTypes.some(t => INCIDENT_WORK_TYPES.includes(t));
      if (hasIncident && incidentData) {
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

      // 반려 후 수정 시 → 반려한 관리자/매니저에게 알림
      const lastRejectComment = await WorkLogComment.findOne({
        where: { log_id: logId, action_type: '반려' },
        order: [['created_at', 'DESC']],
      });
      if (lastRejectComment && lastRejectComment.user_id !== userId) {
        const editor = await User.findByPk(userId, { attributes: ['name'] });
        await Notification.create({
          user_id: lastRejectComment.user_id,
          type: 'revised',
          log_id: logId,
          from_user_id: userId,
          message: `${editor?.name || '작성자'}님이 반려된 작업 내역 [${workLog.title}]을(를) 수정했습니다.`,
        });
      }

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
  async changeStatus(logId, newStatus, userId, comment) {
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

    // 반려 시 코멘트 필수
    const isRejection = currentStatus === '관리자확인' && newStatus === '등록';
    if (isRejection && (!comment || !comment.trim())) {
      throw new AppError('반려 시 사유를 입력해야 합니다.', 400);
    }

    const actionType = isRejection ? '반려' : newStatus;

    await workLog.update({ status: newStatus });

    // 상태 변경 이력 저장
    await WorkLogComment.create({
      log_id: logId,
      user_id: userId,
      action_type: actionType,
      comment: comment?.trim() || null,
    });

    // 알림 생성
    const fromUser = await User.findByPk(userId, { attributes: ['name'] });
    const fromName = fromUser?.name || '관리자';

    if (isRejection) {
      // 반려 → 작성자에게 알림
      await Notification.create({
        user_id: workLog.user_id,
        type: 'rejected',
        log_id: logId,
        from_user_id: userId,
        message: `${fromName}님이 작업 내역 [${workLog.title}]을(를) 반려했습니다.${comment ? ' 사유: ' + comment.trim() : ''}`,
      });
    } else if (newStatus === '관리자확인' || newStatus === '승인완료') {
      // 상태 변경 → 작성자에게 알림
      await Notification.create({
        user_id: workLog.user_id,
        type: 'status_changed',
        log_id: logId,
        from_user_id: userId,
        message: `${fromName}님이 작업 내역 [${workLog.title}]을(를) '${newStatus}' 상태로 변경했습니다.`,
      });
    }

    return workLog;
  }

  /**
   * 작업 로그 삭제 (등록 상태일 때만 가능)
   */
  async delete(logId, userId, userRole) {
    const workLog = await WorkLog.findByPk(logId);

    if (!workLog) {
      throw new AppError('작업 로그를 찾을 수 없습니다.', 404);
    }

    // 소유권 검증: 관리자/매니저가 아니면 본인 작성분만 삭제 가능
    if (workLog.user_id !== userId && !['admin', 'manager'].includes(userRole)) {
      throw new AppError('본인의 작업 내역만 삭제할 수 있습니다.', 403);
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

      // 연관 파일 물리 삭제 + DB 삭제
      const fileService = require('./file.service');
      await fileService.deleteFilesByLogId(logId);
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
    const where = this._buildDateWhere(start_date, end_date);

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
   * 날짜 입력값 검증 (SQL Injection 방지)
   * ISO 8601 날짜 형식(YYYY-MM-DD)만 허용
   */
  _validateDateInput(dateStr) {
    if (!dateStr) return null;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      throw new AppError(`잘못된 날짜 형식입니다: ${dateStr} (YYYY-MM-DD 형식만 허용)`, 400);
    }
    // Date 객체 대신 문자열 반환 (타임존 오프셋 문제 방지)
    return dateStr;
  }

  /**
   * ORM용 날짜 WHERE 조건 빌더 (Sequelize Op 사용)
   * 타임존 문제를 방지하기 위해 문자열 기반 비교 사용
   * '2026-03-27' → '2026-03-27 00:00:00' ~ '2026-03-27 23:59:59' (로컬 시간 기준)
   */
  _buildDateWhere(startDate, endDate, fieldName = 'work_start') {
    const where = {};
    const validStart = this._validateDateInput(startDate);
    const validEnd = this._validateDateInput(endDate);

    if (validStart && validEnd) {
      where[fieldName] = { [Op.between]: [`${validStart} 00:00:00`, `${validEnd} 23:59:59`] };
    } else if (validStart) {
      where[fieldName] = { [Op.gte]: `${validStart} 00:00:00` };
    } else if (validEnd) {
      where[fieldName] = { [Op.lte]: `${validEnd} 23:59:59` };
    }
    return where;
  }

  /**
   * Raw SQL용 날짜 조건 빌더
   * 검증된 Date 객체만 replacements에 전달하여 파라미터화된 쿼리 보장
   * 반환: { condition: string, replacements: object }
   */
  _buildDateCondition(startDate, endDate) {
    const validStart = this._validateDateInput(startDate);
    const validEnd = this._validateDateInput(endDate);
    const replacements = {};
    let condition = '';

    if (validStart && validEnd) {
      condition = 'AND w.work_start BETWEEN :startDate AND :endDate';
      replacements.startDate = `${validStart} 00:00:00`;
      replacements.endDate = `${validEnd} 23:59:59`;
    } else if (validStart) {
      condition = 'AND w.work_start >= :startDate';
      replacements.startDate = `${validStart} 00:00:00`;
    } else if (validEnd) {
      condition = 'AND w.work_start <= :endDate';
      replacements.endDate = `${validEnd} 23:59:59`;
    }

    return { condition, replacements };
  }

  /**
   * 상세 통계 조회 (통계 페이지용)
   * 엔지니어별, 부서별, 고객사별 작업유형 교차 통계 + 장애 상세
   *
   * [보안] 모든 날짜 입력은 _buildDateCondition()을 통해 검증 후
   *        Sequelize replacements 파라미터로만 전달됨 (SQL Injection 방지)
   */
  async getDetailedStatistics({ start_date, end_date }) {
    const { condition: dateCondition, replacements } = this._buildDateCondition(start_date, end_date);
    const dateWhere = this._buildDateWhere(start_date, end_date);

    const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v) || 0);

    // ── 1. 개요 통계 (Sequelize ORM) ──────────────────────
    const [totalCount, byStatusRaw, byWorkTypeRaw] = await Promise.all([
      WorkLog.count({ where: dateWhere }),
      WorkLog.findAll({
        where: dateWhere,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('status')), 'count'],
        ],
        group: ['status'],
        raw: true,
      }),
      WorkLog.findAll({
        where: dateWhere,
        attributes: [
          'work_type',
          [sequelize.fn('COUNT', sequelize.col('work_type')), 'count'],
        ],
        group: ['work_type'],
        raw: true,
      }),
    ]);

    const statusMap = {};
    byStatusRaw.forEach(r => { statusMap[r.status] = toNum(r.count); });
    const typeMap = {};
    byWorkTypeRaw.forEach(r => { typeMap[r.work_type] = toNum(r.count); });

    const overview = {
      total: toNum(totalCount),
      status_registered: statusMap['등록'] || 0,
      status_checked: statusMap['관리자확인'] || 0,
      status_approved: statusMap['승인완료'] || 0,
      type_regular: typeMap['정기점검'] || 0,
      type_incident: typeMap['장애지원'] || 0,
      type_tech: typeMap['기술지원'] || 0,
      type_project: typeMap['프로젝트 지원'] || 0,
      type_etc: typeMap['기타'] || 0,
    };

    const queryOpts = { replacements, type: sequelize.QueryTypes.SELECT };

    // ── 2. 엔지니어별 통계 (TIMESTAMPDIFF 등 MariaDB 함수 사용 → Raw SQL + 파라미터화)
    const byEngineerRaw = await sequelize.query(`
      SELECT
        u.user_id, u.name as user_name, u.position,
        d.dept_name,
        COUNT(*) as total,
        SUM(CASE WHEN w.work_type = '정기점검' THEN 1 ELSE 0 END) as regular_check,
        SUM(CASE WHEN w.work_type = '장애지원' THEN 1 ELSE 0 END) as incident_support,
        SUM(CASE WHEN w.work_type = '기술지원' THEN 1 ELSE 0 END) as tech_support,
        SUM(CASE WHEN w.work_type = '프로젝트 지원' THEN 1 ELSE 0 END) as project_support,
        SUM(CASE WHEN w.work_type = '기타' THEN 1 ELSE 0 END) as etc_work,
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end)) / 60, 1) as total_hours,
        ROUND(SUM(CASE WHEN w.work_type = '정기점검' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as regular_check_hours,
        ROUND(SUM(CASE WHEN w.work_type = '장애지원' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as incident_support_hours,
        ROUND(SUM(CASE WHEN w.work_type = '기술지원' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as tech_support_hours,
        ROUND(SUM(CASE WHEN w.work_type = '프로젝트 지원' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as project_support_hours,
        ROUND(SUM(CASE WHEN w.work_type = '기타' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as etc_work_hours
      FROM work_log w
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN departments d ON u.dept_id = d.dept_id
      WHERE 1=1 ${dateCondition}
      GROUP BY u.user_id, u.name, u.position, d.dept_name
      ORDER BY total_hours DESC
    `, queryOpts);

    const byEngineer = byEngineerRaw.map(r => Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, typeof v === 'string' || v === null ? v : toNum(v)])
    ));

    // ── 3. 프로젝트별 통계 + ACS 정산 ──────────────────
    const byProjectRaw = await sequelize.query(`
      SELECT
        p.project_id, p.project_name,
        c.client_name,
        p.acs_contract_time,
        p.contract_start, p.contract_end,
        COUNT(*) as total,
        COUNT(DISTINCT w.user_id) as engineer_count,
        SUM(CASE WHEN w.work_type = '정기점검' THEN 1 ELSE 0 END) as regular_check,
        SUM(CASE WHEN w.work_type = '장애지원' THEN 1 ELSE 0 END) as incident_support,
        SUM(CASE WHEN w.work_type = '기술지원' THEN 1 ELSE 0 END) as tech_support,
        SUM(CASE WHEN w.work_type = '프로젝트 지원' THEN 1 ELSE 0 END) as project_support,
        SUM(CASE WHEN w.work_type = '기타' THEN 1 ELSE 0 END) as etc_work,
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end)) / 60, 1) as total_hours,
        ROUND(SUM(CASE WHEN w.work_type = '정기점검' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as regular_check_hours,
        ROUND(SUM(CASE WHEN w.work_type = '장애지원' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as incident_support_hours,
        ROUND(SUM(CASE WHEN w.work_type = '기술지원' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as tech_support_hours,
        ROUND(SUM(CASE WHEN w.work_type = '프로젝트 지원' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as project_support_hours,
        ROUND(SUM(CASE WHEN w.work_type = '기타' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as etc_work_hours
      FROM work_log w
      JOIN projects p ON w.project_id = p.project_id
      JOIN client c ON p.client_id = c.client_id
      WHERE 1=1 ${dateCondition}
      GROUP BY p.project_id, p.project_name, c.client_name,
               p.acs_contract_time, p.contract_start, p.contract_end
      ORDER BY total_hours DESC
    `, queryOpts);

    const byProject = byProjectRaw.map(r => {
      const row = Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, typeof v === 'string' || v === null ? v : toNum(v)])
      );
      // ACS 잔여시간 계산
      const acs = r.acs_contract_time != null ? toNum(r.acs_contract_time) : null;
      row.acs_contract_time = acs;
      row.acs_used_time = toNum(r.total_hours);
      row.acs_remaining_time = acs != null ? Math.round((acs - toNum(r.total_hours)) * 10) / 10 : null;
      row.acs_usage_percent = acs != null && acs > 0 ? Math.round((toNum(r.total_hours) / acs) * 1000) / 10 : null;
      return row;
    });

    // ── 4. 고객사별 장애 상세 (영향도, 원인분류) ──────
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

    // ── 5. 월별 추이 (최근 6개월) ──────────────────
    const monthlyTrendRaw = await sequelize.query(`
      SELECT
        DATE_FORMAT(w.work_start, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN w.work_type = '정기점검' THEN 1 ELSE 0 END) as regular_check,
        SUM(CASE WHEN w.work_type = '장애지원' THEN 1 ELSE 0 END) as incident_support,
        SUM(CASE WHEN w.work_type = '기술지원' THEN 1 ELSE 0 END) as tech_support,
        SUM(CASE WHEN w.work_type = '프로젝트 지원' THEN 1 ELSE 0 END) as project_support
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
      project_support: toNum(r.project_support),
    }));

    // ── 6. 부서별 통계 ──────────────────
    const byDepartmentRaw = await sequelize.query(`
      SELECT
        d.dept_id, d.dept_name,
        COUNT(*) as total,
        SUM(CASE WHEN w.work_type = '정기점검' THEN 1 ELSE 0 END) as regular_check,
        SUM(CASE WHEN w.work_type = '장애지원' THEN 1 ELSE 0 END) as incident_support,
        SUM(CASE WHEN w.work_type = '기술지원' THEN 1 ELSE 0 END) as tech_support,
        SUM(CASE WHEN w.work_type = '프로젝트 지원' THEN 1 ELSE 0 END) as project_support,
        SUM(CASE WHEN w.work_type = '기타' THEN 1 ELSE 0 END) as etc_work,
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end)) / 60, 1) as total_hours,
        ROUND(SUM(CASE WHEN w.work_type = '정기점검' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as regular_check_hours,
        ROUND(SUM(CASE WHEN w.work_type = '장애지원' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as incident_support_hours,
        ROUND(SUM(CASE WHEN w.work_type = '기술지원' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as tech_support_hours,
        ROUND(SUM(CASE WHEN w.work_type = '프로젝트 지원' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as project_support_hours,
        ROUND(SUM(CASE WHEN w.work_type = '기타' THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) ELSE 0 END) / 60, 1) as etc_work_hours,
        COUNT(DISTINCT w.user_id) as engineer_count
      FROM work_log w
      JOIN users u ON w.user_id = u.user_id
      JOIN departments d ON u.dept_id = d.dept_id
      WHERE 1=1 ${dateCondition}
      GROUP BY d.dept_id, d.dept_name
      ORDER BY total_hours DESC
    `, queryOpts);

    const byDepartment = byDepartmentRaw.map(r => Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, typeof v === 'string' || v === null ? v : toNum(v)])
    ));

    // ── 7. 야간/주말 작업 통계 ──────────────────
    // 야간 = 18:00~익일09:00 시간대에 실제로 겹치는 분(minutes)만 계산
    // 총 작업시간(분)에서 주간시간(09:00~18:00) 겹침을 빼서 야간시간 산출
    // 자정을 넘는 작업도 정확히 처리됨
    //
    // night_minutes = total_minutes - daytime_overlap
    // daytime_overlap = 같은날 09:00~18:00 겹침 (자정 안 넘는 경우만)
    const overtimeByEngineerRaw = await sequelize.query(`
      SELECT
        u.user_id, u.name as user_name, u.position, d.dept_name,
        COUNT(*) as total_count,
        SUM(CASE WHEN
          TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end)
          - CASE
              WHEN HOUR(w.work_end) * 60 + MINUTE(w.work_end) >= HOUR(w.work_start) * 60 + MINUTE(w.work_start) THEN
                GREATEST(0,
                  LEAST(HOUR(w.work_end) * 60 + MINUTE(w.work_end), 1080)
                  - GREATEST(HOUR(w.work_start) * 60 + MINUTE(w.work_start), 540)
                )
              ELSE
                GREATEST(0, 1080 - GREATEST(HOUR(w.work_start) * 60 + MINUTE(w.work_start), 540))
                + GREATEST(0, LEAST(HOUR(w.work_end) * 60 + MINUTE(w.work_end), 1080) - 540)
            END
          > 0 THEN 1 ELSE 0 END
        ) as night_count,
        SUM(CASE WHEN DAYOFWEEK(w.work_start) IN (1, 7) THEN 1 ELSE 0 END) as weekend_count,
        ROUND(SUM(
          TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end)
          - CASE
              WHEN HOUR(w.work_end) * 60 + MINUTE(w.work_end) >= HOUR(w.work_start) * 60 + MINUTE(w.work_start) THEN
                GREATEST(0,
                  LEAST(HOUR(w.work_end) * 60 + MINUTE(w.work_end), 1080)
                  - GREATEST(HOUR(w.work_start) * 60 + MINUTE(w.work_start), 540)
                )
              ELSE
                GREATEST(0, 1080 - GREATEST(HOUR(w.work_start) * 60 + MINUTE(w.work_start), 540))
                + GREATEST(0, LEAST(HOUR(w.work_end) * 60 + MINUTE(w.work_end), 1080) - 540)
            END
        ) / 60, 1) as night_hours,
        ROUND(SUM(CASE WHEN DAYOFWEEK(w.work_start) IN (1, 7)
          THEN TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) / 60 ELSE 0 END), 1) as weekend_hours,
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, w.work_start, w.work_end) / 60), 1) as total_hours
      FROM work_log w
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN departments d ON u.dept_id = d.dept_id
      WHERE 1=1 ${dateCondition}
      GROUP BY u.user_id, u.name, u.position, d.dept_name
      ORDER BY night_hours DESC
    `, queryOpts);

    const overtimeByEngineer = overtimeByEngineerRaw.map(r => Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, typeof v === 'string' || v === null ? v : toNum(v)])
    ));

    const overtimeSummary = {
      totalNightCount: overtimeByEngineer.reduce((s, r) => s + r.night_count, 0),
      totalWeekendCount: overtimeByEngineer.reduce((s, r) => s + r.weekend_count, 0),
      totalNightHours: Math.round(overtimeByEngineer.reduce((s, r) => s + r.night_hours, 0) * 10) / 10,
      totalWeekendHours: Math.round(overtimeByEngineer.reduce((s, r) => s + r.weekend_hours, 0) * 10) / 10,
    };

    return {
      overview,
      byEngineer,
      byProject,
      byDepartment,
      clientIncidents: Object.values(clientIncidents),
      monthlyTrend,
      overtime: {
        byEngineer: overtimeByEngineer,
        summary: overtimeSummary,
      },
    };
  }
}

module.exports = new WorkService();
