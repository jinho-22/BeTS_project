const path = require('path');
const fileService = require('./file.service');
const AppError = require('../../shared/utils/AppError');
const { sendSuccess, sendCreated } = require('../../shared/utils/response');

class FileController {
  /**
   * POST /api/work/:logId/files - 파일 업로드
   */
  async upload(req, res, next) {
    try {
      const logId = parseInt(req.params.logId, 10);
      const files = req.files || (req.file ? [req.file] : []);

      if (files.length === 0) {
        throw new AppError('업로드할 파일이 없습니다.', 400);
      }

      const result = await fileService.uploadFiles(logId, files, req.user.user_id);
      sendCreated(res, result, '파일 업로드 완료');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/work/:logId/files - 작업 로그의 파일 목록
   */
  async getByLogId(req, res, next) {
    try {
      const logId = parseInt(req.params.logId, 10);
      const result = await fileService.findByLogId(logId);
      sendSuccess(res, result, '파일 목록 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/work/files/:fileId/download - 파일 다운로드
   */
  async download(req, res, next) {
    try {
      const fileId = parseInt(req.params.fileId, 10);
      const file = await fileService.findById(fileId);

      // RFC 5987 인코딩으로 한글 파일명 지원
      const encodedName = encodeURIComponent(file.original_name);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodedName}`
      );
      res.setHeader('Content-Type', 'application/octet-stream');

      res.sendFile(path.resolve(file.file_path));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/work/files/:fileId - 파일 삭제
   */
  async delete(req, res, next) {
    try {
      const fileId = parseInt(req.params.fileId, 10);
      await fileService.deleteFile(fileId, req.user);
      sendSuccess(res, null, '파일 삭제 완료');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FileController();
