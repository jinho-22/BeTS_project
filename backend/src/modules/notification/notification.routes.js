const router = require('express').Router();
const { authenticate } = require('../../shared/middlewares/auth.middleware');
const { Notification, User } = require('../../models');
const { sendSuccess } = require('../../shared/utils/response');
const { Op } = require('sequelize');

router.use(authenticate);

// GET /api/notifications - 내 알림 목록 (최근 50개)
router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.user_id },
      include: [{ model: User, as: 'sender', attributes: ['user_id', 'name', 'position'] }],
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    sendSuccess(res, notifications);
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count - 안 읽은 알림 수
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await Notification.count({
      where: { user_id: req.user.user_id, is_read: false },
    });
    sendSuccess(res, { count });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/:id/read - 알림 읽음 처리
router.patch('/:id/read', async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { notification_id: req.params.id, user_id: req.user.user_id } }
    );
    sendSuccess(res, null, '읽음 처리 완료');
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/read-all - 전체 읽음 처리
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.user_id, is_read: false } }
    );
    sendSuccess(res, null, '전체 읽음 처리 완료');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
