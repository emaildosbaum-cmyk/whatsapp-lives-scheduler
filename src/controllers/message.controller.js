'use strict';
const wa=require('../services/whatsapp.service'),{buildDailyMessage}=require('../services/message.builder'),{fireOwnerMessage}=require('../services/scheduler.service');
async function sendInstant(req,res){
  const{recipient,message}=req.body;
  if(!recipient||!message)return res.status(400).json({error:'recipient e message obrigatorios.'});
  if(wa.getStatus()!=='CONNECTED')return res.status(503).json({error:'WA nao conectado.'});
  try{const jid=await wa.sendMessage(recipient,message);res.json({success:true,sentTo:jid});}
  catch(e){res.status(500).json({error:e.message});}
}
async function testDailyMessage(req,res){
  const period=req.body?.period==='afternoon'?'afternoon':'morning';
  if(wa.getStatus()!=='CONNECTED')return res.status(503).json({error:'WA nao conectado.'});
  if(!process.env.OWNER_PHONE)return res.status(400).json({error:'OWNER_PHONE nao config.'});
  try{const preview=await buildDailyMessage(period);await fireOwnerMessage(period);res.json({success:true,period,preview});}
  catch(e){res.status(500).json({error:e.message});}
}
module.exports={sendInstant,testDailyMessage};
