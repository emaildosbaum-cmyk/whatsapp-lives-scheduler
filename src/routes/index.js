'use strict';

const { Router } = require('express');
const { apiKeyAuth } = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');
const scheduleController = require('../controllers/schedule.controller');
const messageController = require('../controllers/message.controller');
const whatsapp = require('../services/whatsapp.service');

const router = Router();

router.use(apiKeyAuth);

router.get('/status', (req, res) => {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  res.json({
    status: whatsapp.getStatus(),
    serverTime: now,
  });
});

router.get('/groups', async (req, res) => {
  try {
    const groups = await whatsapp.getParticipatingGroups();
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao buscar grupos.', details: err.message });
  }
});

router.get('/auth/qr', authController.getQR);
router.post('/auth/logout', authController.logout);

router.get('/schedules', scheduleController.list);
router.post('/schedules', scheduleController.create);
router.put('/schedules/:id', scheduleController.update);
router.delete('/schedules/:id', scheduleController.remove);

router.post('/messages/send-instant', messageController.sendInstant);
router.post('/messages/test-daily', messageController.testDailyMessage);

module.exports = router;
