'use strict';
const w=require('../services/whatsapp.service');
async function getQR(req,res){const s=w.getStatus();if(s==='CONNECTED')return res.json({status:s,message:'Pareado.'});const q=w.getQR();if(!q)return res.json({status:s,message:'QR gerado em breve...'});return res.json({status:s,qrBase64:q});}
async function logout(req,res){try{await w.logout();res.json({success:true});}catch(e){res.status(500).json({error:e.message});}}
module.exports={getQR,logout};
