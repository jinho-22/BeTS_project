/**
 * 통일된 API 응답 포맷 유틸리티
 */
const sendSuccess = (res, data = null, message = '성공', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendCreated = (res, data = null, message = '생성 완료') => {
  return sendSuccess(res, data, message, 201);
};

const sendPaginated = (res, { rows, count }, page, limit, message = '조회 성공') => {
  return res.status(200).json({
    success: true,
    message,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit),
    },
  });
};

module.exports = { sendSuccess, sendCreated, sendPaginated };
