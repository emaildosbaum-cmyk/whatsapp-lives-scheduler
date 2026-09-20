'use strict';
const{getDB}=require('../config/database'),cron=require('node-cron'),sched=require('../services/scheduler.service'),wa=require('../services/whatsapp.service');
function list(req,res){try{res.json({schedules:getDB().prepare('SELECT * FROM schedules ORDER BY created_at DESC').all()});}catch(e){res.status(500).json({error:e.message});}}
function create(req,res){
  const{recipient,message,cron_expression}=req.body;
  if(!recipient||!message||!cron_expression)return res.status(400).json({error:'Campos obrigatorios.'});
  if(!cron.validate(cron_expression))return res.status(400).json({error:'Cron invalido.'});
  try{const db=getDB(),r=db.prepare('INSERT INTO schedules(recipient,message,cron_expression)VALUES(?,?,?)').run(wa.normalizeJID(recipient),message,cron_expression),s=db.prepare('SELECT * FROM schedules WHERE id=?').get(r.lastInsertRowid);sched.registerTask(s);res.status(201).json({success:true,schedule:s});}
  catch(e){res.status(500).json({error:e.message});}
}
function update(req,res){
  const{id}=req.params,{recipient,message,cron_expression,status}=req.body;
  try{
    const db=getDB(),ex=db.prepare('SELECT * FROM schedules WHERE id=?').get(Number(id));
    if(!ex)return res.status(404).json({error:'Nao encontrado.'});
    if(cron_expression&&!cron.validate(cron_expression))return res.status(400).json({error:'Cron invalido.'});
    db.prepare('UPDATE schedules SET recipient=?,message=?,cron_expression=?,status=? WHERE id=?').run(recipient?wa.normalizeJID(recipient):ex.recipient,message||ex.message,cron_expression||ex.cron_expression,status||ex.status,Number(id));
    const upd=db.prepare('SELECT * FROM schedules WHERE id=?').get(Number(id));
    if((status||ex.status)==='PAUSED')sched.stopTask(id);else sched.registerTask(upd);
    res.json({success:true,schedule:upd});
  }catch(e){res.status(500).json({error:e.message});}
}
function remove(req,res){
  const{id}=req.params;
  try{const db=getDB();if(!db.prepare('SELECT id FROM schedules WHERE id=?').get(Number(id)))return res.status(404).json({error:'Nao encontrado.'});sched.stopTask(id);db.prepare('DELETE FROM schedules WHERE id=?').run(Number(id));res.json({success:true});}
  catch(e){res.status(500).json({error:e.message});}
}
module.exports={list,create,update,remove};
