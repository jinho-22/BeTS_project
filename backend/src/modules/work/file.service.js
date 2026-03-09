const fs = require('fs').promises;
const AppError = require('../../shared/utils/AppError');
const { FileUpload, WorkLog } = require('../../models');

class FileService {
  /**
   * 파일 업로드 (작업 로그에 첨부)
   */
  async uploadFiles(logId, files, userId) {
    // 작업 로그 존재 확인
    const workLog = await WorkLog.findByPk(logId);
    if (!workLog) {
      // 업로드된 물리 파일 롤백 삭제
      await this._cleanupFiles(files.map((f) => f.path));
      throw new AppError('작업 로그를 찾을 수 없습니다.', 404);
    }

    const records = files.map((file) => ({
      log_id: logId,
      user: userId,
      original_name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      stored_name: file.filename,
      file_path: file.path,
      file_size: file.size,
    }));

    const created = await FileUpload.bulkCreate(records);
    return created;
  }

  /**
   * 파일 단건 조회
   */
  async findById(fileId) {
    const file = await FileUpload.findByPk(fileId);
    if (!file) {
      throw new AppError('파일을 찾을 수 없습니다.', 404);
    }
    return file;
  }

  /**
   * 작업 로그별 파일 목록 조회
   */
  async findByLogId(logId) {
    return FileUpload.findAll({ where: { log_id: logId } });
  }

  /**
   * 파일 삭제 (DB + 물리 파일)
   */
  async deleteFile(fileId, user) {
    const file = await FileUpload.findByPk(fileId);
    if (!file) {
      throw new AppError('파일을 찾을 수 없습니다.', 404);
    }

    // 권한 확인: 업로더 본인 또는 admin/manager
    const isOwner = file.user === user.user_id;
    const isPrivileged = user.role === 'admin' || user.role === 'manager';
    if (!isOwner && !isPrivileged) {
      throw new AppError('파일 삭제 권한이 없습니다.', 403);
    }

    // 물리 파일 삭제 (파일 없어도 에러 무시)
    await this._cleanupFiles([file.file_path]);

    // DB 레코드 삭제
    await file.destroy();
  }

  /**
   * 작업 로그의 모든 첨부 파일 물리 삭제
   */
  async deleteFilesByLogId(logId) {
    const files = await FileUpload.findAll({ where: { log_id: logId } });
    if (files.length > 0) {
      await this._cleanupFiles(files.map((f) => f.file_path));
    }
  }

  /**
   * 물리 파일 정리 (에러 무시)
   */
  async _cleanupFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch {
        // 파일이 이미 없는 경우 무시
      }
    }
  }
}

module.exports = new FileService();
