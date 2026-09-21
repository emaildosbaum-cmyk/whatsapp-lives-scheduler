'use strict';

const cron = require('node-cron');
const whatsapp = require('./whatsapp.service');
const { buildDailyMessage } = require('./message.builder');
const {
  getActiveSchedulesFromSupabase,
  updateScheduleInSupabase,
  logDeliveryInSupabase,
  getDailyTargetConfig,
} = require('./supabase.service');

const TIMEZONE = process.env.TIMEZONE || 'America/Sao_Paulo';
const OWNER_PHONE = process.env.OWNER_PHONE;

const activeTasks = new Map();
const MORNING_TASK_ID = '__owner_morning__';
const AFTERNOON_TASK_ID = '__owner_afternoon__';

async function fireOwnerMessage(period) {
  if (whatsapp.getStatus() !== 'CONNECTED') {
    console.warn(`[Scheduler] ⚠️ Cron ${period} disparou mas WhatsApp está desconectado.`);
    return;
  }

  const config = await getDailyTargetConfig();
  const targetRecipient = (config.mode === 'group' && config.groupId)
    ? config.groupId
    : OWNER_PHONE;

  if (!targetRecipient) {
    console.warn('[Scheduler] ⚠️ Nenhum destinatário configurado.');
    return;
  }

  try {
    const message = await buildDailyMessage(period, targetRecipient);
    await whatsapp.sendMessage(targetRecipient, message);
    await logDeliveryInSupabase({ recipient: targetRecipient, message, status: 'SUCCESS' });
    console.log(`[Scheduler] ✅ Mensagem ${period} enviada para ${targetRecipient} (modo: ${config.mode}).`);
  } catch (err) {
    console.error(`[Scheduler] ❌ Erro ${period}:`, err.message);
    await logDeliveryInSupabase({ recipient: targetRecipient, message: `[Live - ${period}]`, status: 'FAILED', error: err.message });
  }
}

function registerOwnerCrons() {
  stopTask(MORNING_TASK_ID);
  stopTask(AFTERNOON_TASK_ID);

  activeTasks.set(MORNING_TASK_ID, cron.schedule('0 9 * * *', () => fireOwnerMessage('morning'), { timezone: TIMEZONE, scheduled: true }));
  activeTasks.set(AFTERNOON_TASK_ID, cron.schedule('0 16 * * *', () => fireOwnerMessage('afternoon'), { timezone: TIMEZONE, scheduled: true }));
  console.log(`[Scheduler] ⏰ Crons 09h e 16h ativos (${TIMEZONE})`);
}

async function fireScheduledMessage(id, recipient, message) {
  if (whatsapp.getStatus() !== 'CONNECTED') {
    await updateScheduleInSupabase(id, { status: 'FAILED', last_run: new Date().toISOString() });
    await logDeliveryInSupabase({ recipient, message, status: 'FAILED', error: 'WhatsApp desconectado' });
    return;
  }
  try {
    await whatsapp.sendMessage(recipient, message);
    await updateScheduleInSupabase(id, { last_run: new Date().toISOString(), status: 'ACTIVE' });
    await logDeliveryInSupabase({ recipient, message, status: 'SUCCESS' });
  } catch (err) {
    await updateScheduleInSupabase(id, { status: 'FAILED', last_run: new Date().toISOString() });
    await logDeliveryInSupabase({ recipient, message, status: 'FAILED', error: err.message });
  }
}

function registerTask(schedule) {
  const { id, recipient, message, cron_expression } = schedule;
  const taskId = String(id);
  if (activeTasks.has(taskId)) stopTask(taskId);
  if (!cron.validate(cron_expression)) return;

  const task = cron.schedule(cron_expression, () => fireScheduledMessage(id, recipient, message), { timezone: TIMEZONE, scheduled: true });
  activeTasks.set(taskId, task);
}

function stopTask(taskId) {
  const id = String(taskId);
  if (activeTasks.has(id)) {
    activeTasks.get(id).stop();
    activeTasks.delete(id);
  }
}

async function loadSchedulesFromDB() {
  try {
    const schedules = await getActiveSchedulesFromSupabase();
    for (const s of schedules) {
      registerTask(s);
    }
    console.log(`[Scheduler] 📂 ${schedules.length} agendamento(s) carregado(s) do Supabase.`);
  } catch (err) {
    console.error('[Scheduler] Erro ao carregar agendamentos do Supabase:', err.message);
  }
}

function init() {
  registerOwnerCrons();
  loadSchedulesFromDB();
}

module.exports = {
  init,
  registerTask,
  stopTask,
  fireOwnerMessage,
  MORNING_TASK_ID,
  AFTERNOON_TASK_ID,
};
