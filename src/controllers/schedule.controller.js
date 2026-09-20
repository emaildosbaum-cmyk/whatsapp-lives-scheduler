'use strict';

const cron = require('node-cron');
const scheduler = require('../services/scheduler.service');
const whatsapp = require('../services/whatsapp.service');
const {
  listSchedulesFromSupabase,
  createScheduleInSupabase,
  updateScheduleInSupabase,
  deleteScheduleInSupabase
} = require('../services/supabase.service');

async function list(req, res) {
  try {
    const schedules = await listSchedulesFromSupabase();
    res.json({ schedules });
  } catch (err) {
    console.error('[ScheduleController] list:', err.message);
    res.status(500).json({ error: 'Falha ao listar agendamentos do Supabase.' });
  }
}

async function create(req, res) {
  const { recipient, message, cron_expression } = req.body;
  if (!recipient || !message || !cron_expression) {
    return res.status(400).json({ error: 'Campos obrigatórios: recipient, message, cron_expression.' });
  }
  if (!cron.validate(cron_expression)) {
    return res.status(400).json({ error: `Expressão cron inválida: "${cron_expression}".` });
  }

  const normalizedRecipient = whatsapp.normalizeJID(recipient);
  try {
    const newSchedule = await createScheduleInSupabase({
      recipient: normalizedRecipient,
      message,
      cron_expression,
    });
    scheduler.registerTask(newSchedule);
    res.status(201).json({ success: true, schedule: newSchedule });
  } catch (err) {
    console.error('[ScheduleController] create:', err.message);
    res.status(500).json({ error: 'Falha ao criar agendamento no Supabase.' });
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { recipient, message, cron_expression, status } = req.body;
  try {
    if (cron_expression && !cron.validate(cron_expression)) {
      return res.status(400).json({ error: `Expressão cron inválida: "${cron_expression}".` });
    }
    const payload = {};
    if (recipient) payload.recipient = whatsapp.normalizeJID(recipient);
    if (message) payload.message = message;
    if (cron_expression) payload.cron_expression = cron_expression;
    if (status) payload.status = status;

    const updated = await updateScheduleInSupabase(id, payload);
    if (updated.status === 'PAUSED') {
      scheduler.stopTask(id);
    } else if (updated.status === 'ACTIVE') {
      scheduler.registerTask(updated);
    }
    res.json({ success: true, schedule: updated });
  } catch (err) {
    console.error('[ScheduleController] update:', err.message);
    res.status(500).json({ error: 'Falha ao atualizar agendamento no Supabase.' });
  }
}

async function remove(req, res) {
  const { id } = req.params;
  try {
    scheduler.stopTask(id);
    await deleteScheduleInSupabase(id);
    res.json({ success: true, message: `Agendamento #${id} removido do Supabase.` });
  } catch (err) {
    console.error('[ScheduleController] remove:', err.message);
    res.status(500).json({ error: 'Falha ao remover agendamento do Supabase.' });
  }
}

module.exports = { list, create, update, remove };
