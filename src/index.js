// src/index.js — VKYC API server
'use strict';

const express   = require('express');
const cors      = require('cors');

const agentRoutes     = require('./routes/agent');
const applicantRoutes = require('./routes/applicant');
const auditorRoutes   = require('./routes/auditor');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3333', 'http://localhost:3000', 'https://sayanch83.github.io'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    service: 'VKYC API',
    version: '1.0.0',
    description: 'RBI V-CIP Video KYC Backend',
    status: 'running',
    endpoints: {
      agent:     '/api/v1/agent',
      applicant: '/api/v1/applicant',
      auditor:   '/api/v1/auditor',
      health:    '/health',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use('/api/v1/agent',     agentRoutes);
app.use('/api/v1/applicant', applicantRoutes);
app.use('/api/v1/auditor',   auditorRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`VKYC API running on http://localhost:${PORT}`);
});

module.exports = app;
