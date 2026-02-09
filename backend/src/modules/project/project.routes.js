const router = require('express').Router();
const projectController = require('./project.controller');
const { validate } = require('../../shared/middlewares/validation.middleware');
const { authenticate } = require('../../shared/middlewares/auth.middleware');
const { authorize } = require('../../shared/middlewares/rbac.middleware');
const {
  createClientSchema,
  updateClientSchema,
  createProjectSchema,
  updateProjectSchema,
  createContactSchema,
  updateContactSchema,
} = require('./project.validator');

// 모든 라우트에 인증 필요
router.use(authenticate);

// ════════════════════════════════════════
// Client (고객사) API
// ════════════════════════════════════════
router.get('/clients', projectController.getAllClients);
router.get('/clients/:id', projectController.getClientById);
router.post('/clients', authorize('admin', 'manager'), validate(createClientSchema), projectController.createClient);
router.put('/clients/:id', authorize('admin', 'manager'), validate(updateClientSchema), projectController.updateClient);
router.delete('/clients/:id', authorize('admin'), projectController.deleteClient);

// ════════════════════════════════════════
// Project (프로젝트) API
// ════════════════════════════════════════
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', authorize('admin', 'manager'), validate(createProjectSchema), projectController.createProject);
router.put('/:id', authorize('admin', 'manager'), validate(updateProjectSchema), projectController.updateProject);
router.delete('/:id', authorize('admin'), projectController.deleteProject);

// ════════════════════════════════════════
// ManagerContact (고객사 담당자) API
// ════════════════════════════════════════
router.get('/:projectId/contacts', projectController.getContactsByProject);
router.post('/contacts', authorize('admin', 'manager'), validate(createContactSchema), projectController.createContact);
router.put('/contacts/:id', authorize('admin', 'manager'), validate(updateContactSchema), projectController.updateContact);
router.delete('/contacts/:id', authorize('admin'), projectController.deleteContact);

module.exports = router;
