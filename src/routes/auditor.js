// src/routes/auditor.js
const express = require('express');
const router  = express.Router();
const { MOCK_AUDIT_CASES } = require('../mock/data');

// ── GET /auditor/cases — audit queue ─────────────────────────────────────
router.get('/cases', (req, res) => {
  const { status } = req.query;
  const list = status ? MOCK_AUDIT_CASES.filter(c => c.status === status) : MOCK_AUDIT_CASES;
  res.json({ success: true, cases: list });
});

// ── GET /auditor/cases/:id — single audit case ────────────────────────────
router.get('/cases/:id', (req, res) => {
  const c = MOCK_AUDIT_CASES.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, error: 'Case not found' });
  res.json({ success: true, case: c });
});

// ── POST /auditor/cases/:id/decision — approve or reject ─────────────────
router.post('/cases/:id/decision', (req, res) => {
  const c = MOCK_AUDIT_CASES.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, error: 'Case not found' });
  const { decision, remarks } = req.body;
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ success: false, error: 'Invalid decision' });
  }
  if (decision === 'reject' && !remarks) {
    return res.status(400).json({ success: false, error: 'Remarks required for rejection' });
  }
  c.status  = decision === 'approve' ? 'completed' : 'rejected';
  c.remarks = remarks || '';
  c.decidedAt = new Date().toISOString();
  res.json({ success: true, case: c });
});

module.exports = router;
