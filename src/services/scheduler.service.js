'use strict';
const cron=require('node-cron');
const{getDB}=require('../config/database');
const whatsapp=require('./whatsapp.service');
const{buildDailyMessage}=require('./message.builder');
const TIMEZONE=process.env.TIMEZONE||'America/Sao_Paulo';
const OWNER_PHONE=process.env.OWNER_PHONE;
const activeTasks=new Map();
const MID='__owner_morning__',AID='__owner_afternoon__';
async function fireOwnerMessage(period){
  if(!OWNER_PHONE){console.warn('[Sched] OWNER_PHONE nao config.');return;}
  if(whatsapp.getStatus()!=='CONNECTED'){console.warn(`[Sched] ${period}: WA off.`);return;}
  try{const msg=await buildDailyMessage(period);await whatsapp.sendMessage(OWNER_PHONE,msg);console.log(`[Sched] ${period} ok.`);}
  catch(e){console.error(`[Sched] ${period} err:`,e.message);}
}
function registerOwnerCrons(){
  stopTask(MID);stopTask(AID);
  activeTasks.set(MID,cron.schedule('0 9 * * *',()=>fireOwnerMessage('morning'),{timezone:TIMEZONE}));
  activeTasks.set(AID,cron.schedule('0 16 * * *',()=>fireOwnerMessage('afternoon'),{timezone:TIMEZONE}));
  console.log(`[Sched] Crons: 09h 16h (${TIMEZONE})`);
}
async function fireScheduledMessage(id,recipient,message){
  const db=getDB();
  if(whatsapp.getStatus()!=='CONNECTED'){db.prepare(`UPDATE schedules SET status='FAILED',last_run=datetime('now') WHERE id=?`).run(id);return;}
  try{await whatsapp.sendMessage(recipient,message);db.prepare(`UPDATE schedules SET last_run=datetime('now'),status='ACTIVE' WHERE id=?`).run(id);}
  catch(e){console.error(`[Sched] #${id}:`,e.message);db.prepare(`UPDATE schedules SET status='FAILED',last_run=datetime('now') WHERE id=?`).run(id);}
}
function registerTask({id,recipient,message,cron_expression}){
  const tid=String(id);
  if(activeTasks.has(tid))stopTask(tid);
  if(!cron.validate(cron_expression)){console.error(`[Sched] cron inv #${id}`);return;}
  activeTasks.set(tid,cron.schedule(cron_expression,()=>fireScheduledMessage(id,recipient,message),{timezone:TIMEZONE}));
}
function stopTask(tid){const id=String(tid);if(activeTasks.has(id)){activeTasks.get(id).stop();activeTasks.delete(id);}}
function loadSchedulesFromDB(){const rows=getDB().prepare(`SELECT * FROM schedules WHERE status='ACTIVE'`).all();rows.forEach(s=>registerTask(s));console.log(`[Sched] ${rows.length} loaded.`);}
function init(){registerOwnerCrons();loadSchedulesFromDB();}
module.exports={init,registerTask,stopTask,fireOwnerMessage};
