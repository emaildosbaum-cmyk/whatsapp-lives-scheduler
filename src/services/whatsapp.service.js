'use strict';
const{default:makeWASocket,useMultiFileAuthState,DisconnectReason,fetchLatestBaileysVersion}=require('@whiskeysockets/baileys');
const pino=require('pino'),QRCode=require('qrcode'),fs=require('fs'),path=require('path');
const AUTH_DIR=path.join(__dirname,'../../auth_info_baileys');
const LOGS_DIR=path.join(__dirname,'../../logs');
if(!fs.existsSync(AUTH_DIR))fs.mkdirSync(AUTH_DIR,{recursive:true});
if(!fs.existsSync(LOGS_DIR))fs.mkdirSync(LOGS_DIR,{recursive:true});
const logger=pino({level:'error'});
let sock=null,connectionStatus='DISCONNECTED',currentQRBase64=null,reconnectTimeout=null,onConnectedCallback=null;
function setOnConnectedCallback(fn){onConnectedCallback=fn;}
function getStatus(){return connectionStatus;}
function getQR(){return currentQRBase64;}
function getSock(){return sock;}
function normalizeJID(phone){const d=String(phone).replace(/\D/g,'');return`${d.length<=11?'55'+d:d}@s.whatsapp.net`;}
async function validateAndGetJID(phone){
  if(!sock||connectionStatus!=='CONNECTED')throw new Error('WA nao conectado.');
  const jid=normalizeJID(phone),[r]=await sock.onWhatsApp(jid);
  if(!r||!r.exists)throw new Error(`Numero ${phone} nao encontrado.`);
  return r.jid;
}
async function sendMessage(phone,text){
  if(!sock||connectionStatus!=='CONNECTED')throw new Error('WA nao conectado.');
  const jid=await validateAndGetJID(phone);
  await sock.sendMessage(jid,{text});console.log(`[WA] -> ${jid}`);
  return jid;
}
function clearAuthFiles(){if(fs.existsSync(AUTH_DIR))fs.readdirSync(AUTH_DIR).forEach(f=>fs.unlinkSync(path.join(AUTH_DIR,f)));}
async function connect(){
  if(reconnectTimeout){clearTimeout(reconnectTimeout);reconnectTimeout=null;}
  connectionStatus='CONNECTING';currentQRBase64=null;
  console.log('[WA] Iniciando...');
  const{state,saveCreds}=await useMultiFileAuthState(AUTH_DIR);
  const{version}=await fetchLatestBaileysVersion();
  sock=makeWASocket({version,logger,printQRInTerminal:false,auth:state,browser:['LivesSched','Chrome','120.0.0'],connectTimeoutMs:30000,defaultQueryTimeoutMs:20000});
  sock.ev.on('creds.update',saveCreds);
  sock.ev.on('connection.update',async({connection,lastDisconnect,qr})=>{
    if(qr){try{currentQRBase64=await QRCode.toDataURL(qr);connectionStatus='CONNECTING';console.log('[WA] QR gerado.');}catch(e){console.error('[WA] QR err:',e.message);}}
    if(connection==='open'){connectionStatus='CONNECTED';currentQRBase64=null;console.log('[WA] Conectado!');if(typeof onConnectedCallback==='function')onConnectedCallback();}
    if(connection==='close'){connectionStatus='DISCONNECTED';const code=lastDisconnect?.error?.output?.statusCode;console.log(`[WA] Fechado. code:${code}`);if(code===DisconnectReason.loggedOut){clearAuthFiles();reconnectTimeout=setTimeout(connect,1000);}else reconnectTimeout=setTimeout(connect,5000);}
  });
}
async function logout(){
  if(sock){try{await sock.logout();}catch(_){}sock=null;}
  connectionStatus='DISCONNECTED';currentQRBase64=null;clearAuthFiles();
  reconnectTimeout=setTimeout(connect,1000);
}
module.exports={connect,logout,sendMessage,normalizeJID,validateAndGetJID,getStatus,getQR,getSock,setOnConnectedCallback};
