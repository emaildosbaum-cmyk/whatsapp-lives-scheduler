'use strict';

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const { supabase } = require('./supabase.service');
const { useSupabaseAuthState } = require('./supabase-auth.service');

const baileysLogger = pino({ level: 'error' });

let sock = null;
let connectionStatus = 'DISCONNECTED';
let currentQRBase64 = null;
let reconnectTimeout = null;
let clearAuthFn = null;
let onConnectedCallback = null;

function setOnConnectedCallback(fn) {
  onConnectedCallback = fn;
}

function getStatus() {
  return connectionStatus;
}

function getQR() {
  return currentQRBase64;
}

function getSock() {
  return sock;
}

function normalizeJID(phone) {
  if (String(phone).includes('@g.us')) {
    return phone;
  }
  const digits = String(phone).replace(/\D/g, '');
  const withDDI = digits.length <= 11 ? `55${digits}` : digits;
  return `${withDDI}@s.whatsapp.net`;
}

async function validateAndGetJID(phone) {
  if (!sock || connectionStatus !== 'CONNECTED') {
    throw new Error('WhatsApp não está conectado.');
  }

  if (String(phone).includes('@g.us')) {
    return phone;
  }

  const jid = normalizeJID(phone);
  const myJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
  if (myJid && jid.includes(myJid.split('@')[0])) {
    return myJid;
  }

  const [result] = await sock.onWhatsApp(jid);
  if (!result || !result.exists) {
    throw new Error(`Número ${phone} não encontrado no WhatsApp.`);
  }

  return result.jid;
}

async function sendMessage(phone, text) {
  if (!sock || connectionStatus !== 'CONNECTED') {
    throw new Error('WhatsApp não conectado. Aguarde a reconexão ou escaneie o QR Code.');
  }

  const jid = await validateAndGetJID(phone);

  await sock.sendMessage(jid, {
    text,
  });

  console.log(`[WhatsApp] ✅ Mensagem enviada para ${jid}`);
  return jid;
}

async function connect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  connectionStatus = 'CONNECTING';
  currentQRBase64 = null;

  console.log('[WhatsApp] 🔄 Iniciando conexão com autenticação no Supabase...');

  const { state, saveCreds, clearAuth } = await useSupabaseAuthState(supabase);
  clearAuthFn = clearAuth;

  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: baileysLogger,
    printQRInTerminal: false,
    auth: state,
    browser: ['Ubuntu', 'Chrome', '124.0.0'],
    syncFullHistory: true,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 30_000,
    keepAliveIntervalMs: 25_000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        currentQRBase64 = await QRCode.toDataURL(qr);
        connectionStatus = 'CONNECTING';
        console.log('[WhatsApp] 📱 QR Code gerado.');
      } catch (err) {
        console.error('[WhatsApp] Erro ao gerar QR Code:', err.message);
      }
    }

    if (connection === 'open') {
      connectionStatus = 'CONNECTED';
      currentQRBase64 = null;
      console.log(`[WhatsApp] ✅ Conectado como ${sock.user?.id || 'usuário'}! Sessão ativa no Supabase.`);

      if (typeof onConnectedCallback === 'function') {
        onConnectedCallback();
      }
    }

    if (connection === 'close') {
      connectionStatus = 'DISCONNECTED';
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      console.log(`[WhatsApp] ❌ Conexão encerrada. Código: ${statusCode}`);

      if (isLoggedOut) {
        console.log('[WhatsApp] 🚪 Logout detectado. Limpando credenciais no Supabase...');
        if (clearAuthFn) await clearAuthFn();
        reconnectTimeout = setTimeout(connect, 1000);
      } else {
        const delay = 5000;
        console.log(`[WhatsApp] 🔁 Reconectando em ${delay / 1000}s...`);
        reconnectTimeout = setTimeout(connect, delay);
      }
    }
  });
}

async function logout() {
  if (sock) {
    try {
      await sock.logout();
    } catch (_) {}
    sock = null;
  }
  connectionStatus = 'DISCONNECTED';
  currentQRBase64 = null;
  if (clearAuthFn) await clearAuthFn();
  reconnectTimeout = setTimeout(connect, 1000);
}

module.exports = {
  connect,
  logout,
  sendMessage,
  normalizeJID,
  validateAndGetJID,
  getStatus,
  getQR,
  getSock,
  setOnConnectedCallback,
};
