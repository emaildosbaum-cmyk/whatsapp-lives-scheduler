'use strict';

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function getWeekdayIndexSP() {
  const now = new Date();
  const spDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const jsDay = spDate.getDay();
  return (jsDay + 6) % 7;
}

async function getLivesForToday() {
  const weekdayIndex = getWeekdayIndexSP();
  const { data, error } = await supabase
    .from('lives')
    .select('weekday_label, game, time, note')
    .eq('weekday_index', weekdayIndex)
    .order('time', { ascending: true });

  if (error || !data || data.length === 0) return null;
  return data;
}

function getTodayLabel() {
  const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  return WEEKDAY_NAMES[getWeekdayIndexSP()];
}

function getTodayFormatted() {
  const now = new Date();
  return now.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
}

async function getDailyTargetConfig() {
  try {
    const { data } = await supabase
      .from('whatsapp_config')
      .select('value')
      .eq('key', 'daily_target')
      .single();

    if (data?.value) return data.value;
  } catch (err) {
    console.warn('[SupabaseService] Falha daily_target:', err.message);
  }
  return { mode: 'direct', groupId: null, groupName: null };
}

async function setDailyTargetConfig(config) {
  const { data, error } = await supabase
    .from('whatsapp_config')
    .upsert({
      key: 'daily_target',
      value: config,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data.value;
}

async function listSchedulesFromSupabase() {
  const { data, error } = await supabase
    .from('whatsapp_schedules')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getActiveSchedulesFromSupabase() {
  const { data, error } = await supabase
    .from('whatsapp_schedules')
    .select('*')
    .eq('status', 'ACTIVE');
  if (error) throw error;
  return data || [];
}

async function createScheduleInSupabase({ recipient, message, cron_expression }) {
  const { data, error } = await supabase
    .from('whatsapp_schedules')
    .insert([{ recipient, message, cron_expression, status: 'ACTIVE' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateScheduleInSupabase(id, fields) {
  const { data, error } = await supabase
    .from('whatsapp_schedules')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteScheduleInSupabase(id) {
  const { error } = await supabase
    .from('whatsapp_schedules')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

async function logDeliveryInSupabase({ recipient, message, status, error = null }) {
  try {
    await supabase
      .from('whatsapp_logs')
      .insert([{ recipient, message, status, error }]);
  } catch (err) {
    console.error('[SupabaseService] Erro log:', err.message);
  }
}

module.exports = {
  supabase,
  getLivesForToday,
  getTodayLabel,
  getTodayFormatted,
  getWeekdayIndexSP,
  getDailyTargetConfig,
  setDailyTargetConfig,
  listSchedulesFromSupabase,
  getActiveSchedulesFromSupabase,
  createScheduleInSupabase,
  updateScheduleInSupabase,
  deleteScheduleInSupabase,
  logDeliveryInSupabase,
};
