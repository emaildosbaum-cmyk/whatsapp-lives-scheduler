'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const routes = require('./routes');
const whatsapp = require('./services/whatsapp.service');
const scheduler = require('./services/scheduler.service');

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const app = express();

app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
  credentials: false,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error('[Server] Erro:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno.' });
});

async function bootstrap() {
  try {
    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor rodando na porta ${PORT} (Supabase Backend)`);
      console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Fuso horário dos crons: ${process.env.TIMEZONE || 'America/Sao_Paulo'}\n`);
    });

    whatsapp.setOnConnectedCallback(() => {
      scheduler.init();
    });

    await whatsapp.connect();
  } catch (err) {
    console.error('[Server] Falha crítica no bootstrap:', err.message);
    process.exit(1);
  }
}

bootstrap();

module.exports = app;
