// src/routes/agent.js
const express = require('express');
const router  = express.Router();
const { MOCK_CASES, sessions, uuid } = require('../mock/data');

// ── GET /agent/cases — dashboard case list ─────────────────────────────────
router.get('/cases', (req, res) => {
  res.json({ success: true, cases: MOCK_CASES });
});

// ── GET /agent/cases/:id — single case ────────────────────────────────────
router.get('/cases/:id', (req, res) => {
  const c = MOCK_CASES.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, error: 'Case not found' });
  res.json({ success: true, case: c });
});

// ── POST /agent/cases/:id/accept — start session ──────────────────────────
router.post('/cases/:id/accept', (req, res) => {
  const c = MOCK_CASES.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, error: 'Case not found' });
  c.status = 'in-progress';
  const sessionId = uuid();
  sessions[sessionId] = {
    caseId: c.id,
    startedAt: new Date().toISOString(),
    officerId: req.body.officerId || 'AGT001',
    officerName: req.body.officerName || 'Agent Kumar',
    events: [],
  };
  res.json({ success: true, sessionId, case: c });
});

// ── POST /agent/sessions/:sid/liveness — run in-session liveness ──────────
router.post('/sessions/:sid/liveness', (req, res) => {
  const session = sessions[req.params.sid];
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  // Simulate score (replace with real SDK in production)
  const score = Math.round(88 + Math.random() * 10);
  const result = { score, passed: score >= 75, method: 'ISO-30107-3-Passive', ts: new Date().toISOString() };
  session.inSessionLiveness = result;
  session.events.push({ type: 'liveness', ...result });
  res.json({ success: true, liveness: result });
});

// ── POST /agent/sessions/:sid/face-match — face capture + match ───────────
router.post('/sessions/:sid/face-match', (req, res) => {
  const session = sessions[req.params.sid];
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  // Simulate match scores (replace with real Digilocker + face SDK in production)
  const faceMatch     = parseFloat((88 + Math.random() * 10).toFixed(1));
  const locationMatch = parseFloat((93 + Math.random() * 6).toFixed(1));
  session.faceMatch     = faceMatch;
  session.locationMatch = locationMatch;
  session.events.push({ type: 'face-match', faceMatch, locationMatch });
  res.json({ success: true, faceMatch, locationMatch });
});

// ── POST /agent/sessions/:sid/ocr — run OCR ──────────────────────────────
router.post('/sessions/:sid/ocr', (req, res) => {
  const session = sessions[req.params.sid];
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  const c = MOCK_CASES.find(x => x.id === session.caseId);
  // Simulate OCR extraction (replace with real OCR SDK in production)
  const ocrData = {
    name:   c.name.toUpperCase(),
    pan:    c.pan,
    dob:    c.dob,
    father: c.father.toUpperCase(),
  };
  const nameMatch = parseFloat((95 + Math.random() * 4).toFixed(1));
  const panMatch  = parseFloat((97 + Math.random() * 3).toFixed(1));
  session.ocrData   = ocrData;
  session.nameMatch = nameMatch;
  session.panMatch  = panMatch;
  session.events.push({ type: 'ocr', ocrData, nameMatch, panMatch });
  res.json({ success: true, ocrData, nameMatch, panMatch });
});

// ── POST /agent/sessions/:sid/decision — approve or reject ───────────────
router.post('/sessions/:sid/decision', (req, res) => {
  const session = sessions[req.params.sid];
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  const { decision, remarks, questionnaire, questionnaireResponses } = req.body;
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ success: false, error: 'Invalid decision' });
  }
  if (decision === 'reject' && !remarks) {
    return res.status(400).json({ success: false, error: 'Remarks required for rejection' });
  }
  session.decision               = decision;
  session.remarks                = remarks;
  session.questionnaire          = questionnaire;
  session.questionnaireResponses = questionnaireResponses;
  session.decidedAt              = new Date().toISOString();
  // Update case status
  const c = MOCK_CASES.find(x => x.id === session.caseId);
  if (c) c.status = decision === 'approve' ? 'approved' : 'rejected';
  const referenceId = 'VKP-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  session.referenceId = referenceId;
  session.events.push({ type: 'decision', decision, remarks, decidedAt: session.decidedAt });
  res.json({ success: true, referenceId, session });
});

module.exports = router;
