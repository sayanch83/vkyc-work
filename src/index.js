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
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
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

// ── Recording store — temporary in-memory (for demo) ────────────────────────
// Stores base64 WebM recording from agent after session ends
let _recording = null;

app.post('/api/v1/recording', (req, res) => {
  const { sessionId, caseId, agentId, data, mimeType, duration } = req.body;
  if (!data) return res.status(400).json({ success: false, error: 'No recording data' });
  _recording = {
    sessionId: sessionId || ('SES-' + Date.now()),
    caseId: caseId || 'KYC-DEMO-001',
    agentId: agentId || 'AGT001',
    data,        // base64 encoded video
    mimeType: mimeType || 'video/webm',
    duration,
    recordedAt: new Date().toISOString()
  };
  console.log('[Recording] Stored session:', _recording.sessionId, 'size:', Math.round(data.length/1024)+'KB');
  res.json({ success: true, sessionId: _recording.sessionId });
});

app.get('/api/v1/recording', (_req, res) => {
  if (!_recording) return res.json({ success: false, error: 'No recording available' });
  res.json({ success: true, recording: _recording });
});

app.delete('/api/v1/recording', (_req, res) => {
  _recording = null;
  res.json({ success: true });
});

// ── Demo config — editable applicant/case data for sales demos ───────────────
let _demoConfig = {
  applicant: {
    name: 'Harshit Sodagar',
    mobile: '98765 43210',
    appId: 'CDL2847391',
    product: 'Personal Loan',
    amount: 300000,
    pan: 'AWEPD1123P',
    dob: '02/08/1979',
    father: 'Suresh Kumar',
    address: 'B-204, Andheri West, Mumbai 400058',
    aadhaarOffset: -1,  // days from today (-1=yesterday, -365=1yr ago)
  },
  queue: [
    { name:'Priya Mehta',     product:'Home Loan',     amount:5000000, status:'completed', waitMins:0  },
    { name:'Rahul Verma',     product:'Car Loan',      amount:800000,  status:'in-session', waitMins:0  },
    { name:'Anita Sharma',    product:'Personal Loan', amount:200000,  status:'in-queue',   waitMins:8  },
  ]
};

app.get('/api/v1/demo-config', (_req, res) => {
  res.json({ success: true, config: _demoConfig });
});

app.post('/api/v1/demo-config', (req, res) => {
  if (req.body.applicant) _demoConfig.applicant = { ..._demoConfig.applicant, ...req.body.applicant };
  if (req.body.queue)     _demoConfig.queue     = req.body.queue;
  console.log('[Config] Updated demo config:', _demoConfig.applicant.name);
  res.json({ success: true, config: _demoConfig });
});

app.post('/api/v1/demo-config/reset', (_req, res) => {
  _demoConfig = {
    applicant: {
      name: 'Harshit Sodagar', mobile: '98765 43210', appId: 'CDL2847391',
      product: 'Personal Loan', amount: 300000, pan: 'AWEPD1123P',
      dob: '02/08/1979', father: 'Suresh Kumar',
      address: 'B-204, Andheri West, Mumbai 400058', aadhaarOffset: -1,
    },
    queue: [
      { name:'Priya Mehta',  product:'Home Loan',     amount:5000000, status:'completed',  waitMins:0 },
      { name:'Rahul Verma',  product:'Car Loan',      amount:800000,  status:'in-session', waitMins:0 },
      { name:'Anita Sharma', product:'Personal Loan', amount:200000,  status:'in-queue',   waitMins:8 },
    ]
  };
  res.json({ success: true });
});

// ── Session result — agent posts decision after session ──────────────────────
let _sessionResult = null;

app.post('/api/v1/session-result', (req, res) => {
  _sessionResult = { ...req.body, decidedAt: new Date().toISOString() };
  console.log('[Session] Result stored:', _sessionResult.decision, _sessionResult.applicantName);
  res.json({ success: true });
});

app.get('/api/v1/session-result', (_req, res) => {
  res.json({ success: true, result: _sessionResult });
});

app.delete('/api/v1/session-result', (_req, res) => {
  _sessionResult = null;
  res.json({ success: true });
});

// ── Audit result — auditor posts final decision ───────────────────────────────
let _auditResult = null;

app.post('/api/v1/audit-result', (req, res) => {
  _auditResult = { ...req.body, auditedAt: new Date().toISOString() };
  console.log('[Audit] Result stored:', _auditResult.decision, _auditResult.caseId);
  res.json({ success: true });
});

app.get('/api/v1/audit-result', (_req, res) => {
  res.json({ success: true, result: _auditResult });
});

app.delete('/api/v1/audit-result', (_req, res) => {
  _auditResult = null;
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
