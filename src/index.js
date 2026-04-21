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

// ── Signal store — cross-device applicant→agent notification ─────────────────
let _signal = null;
let _agentSignal = null;  // agent→applicant commands

// Agent → Applicant commands queue
let _agentCmdQueue = []; // queue of commands
app.post('/api/v1/agent-signal', (req, res) => {
  _agentCmdQueue.push({ ...req.body, id: Date.now() + Math.random(), receivedAt: Date.now() });
  // Keep only last 20 commands
  if (_agentCmdQueue.length > 20) _agentCmdQueue = _agentCmdQueue.slice(-20);
  res.json({ success: true });
});
// Applicant polls with ?after=<lastId> to get only new commands
app.get('/api/v1/agent-signal', (req, res) => {
  const after = parseFloat(req.query.after || '0');
  const newCmds = _agentCmdQueue.filter(c => c.id > after && Date.now() - c.receivedAt < 60000);
  res.json({ commands: newCmds });
});
app.delete('/api/v1/agent-signal', (_req, res) => {
  _agentCmdQueue = [];
  res.json({ success: true });
});
app.post('/api/v1/signal', (req, res) => {
  _signal = { ...req.body, receivedAt: Date.now() };
  console.log('[Signal] Received:', _signal);
  res.json({ success: true });
});
app.get('/api/v1/signal', (_req, res) => {
  if (_signal && Date.now() - _signal.receivedAt < 30000) {
    res.json(_signal);
  } else {
    res.json({ type: 'none' });
  }
});
app.delete('/api/v1/signal', (_req, res) => {
  _signal = null;
  res.json({ success: true });
});

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
