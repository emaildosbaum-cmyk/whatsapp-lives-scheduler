'use strict';
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
function getWeekdayIndexSP() {
  const sp = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return (sp.getDay() + 6) % 7;
}
async function getLivesForToday() {
  const { data, error } = await supabase.from('lives').select('weekday_label,game,time').eq('weekday_index', getWeekdayIndexSP()).order('time', { ascending: true });
  if (error || !data || !data.length) return null;
  return data;
}
function getTodayFormatted() {
  return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit' });
}
module.exports = { getLivesForToday, getTodayFormatted, getWeekdayIndexSP };
