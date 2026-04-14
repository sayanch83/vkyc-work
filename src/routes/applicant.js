// src/routes/applicant.js
const express = require('express');
const router  = express.Router();
const { MOCK_CASES, sessions, uuid } = require('../mock/data');

// ── POST /applicant/consent — submit consents ─────────────────────────────
router.post('/consent', (req, res) => {
  const { appId, consents } = req.body;
  if (!appId || !consents) {
    return res.status(400).json({ success: false, error: 'appId and consents required' });
  }
  // In production: persist to DB with timestamps
  const recorded = Object.entries(consents).map(([id, ts]) => ({ id, ts }));
  res.json({ success: true, recorded, message: 'Consents recorded' });
});

// ── GET /applicant/queue/:appId — queue position ──────────────────────────
router.get('/queue/:appId', (req, res) => {
  // Simulate queue position (in production: real queue service)
  const queuePos = Math.floor(Math.random() * 3) + 1;
  const waitMins = queuePos * 3;
  res.json({ success: true, queuePos, waitMins });
});

// ── POST /applicant/liveness — submit pre-session liveness result ─────────
router.post('/liveness', (req, res) => {
  const { appId, score, method } = req.body;
  // Simulate pass/fail (in production: real SDK result)
  const passed = (score || Math.round(87 + Math.random() * 12)) >= 75;
  const finalScore = score || Math.round(87 + Math.random() * 12);
  // In production: store in pre-check audit record
  res.json({
    success: true,
    passed,
    score: finalScore,
    method: method || 'ISO-30107-3-Passive',
    ts: new Date().toISOString(),
  });
});

// ── GET /applicant/slots — available reschedule slots ─────────────────────
router.get('/slots', (req, res) => {
  const days    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const result  = [];
  let daysAdded = 0;
  let offset    = 1;
  const today   = new Date();

  while (daysAdded < 5) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset++);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    const label   = `${days[dow]}, ${date.getDate()} ${months[date.getMonth()]}`;
    const dateStr = date.toISOString().slice(0, 10);

    // Build 10:00–17:00 in 30-min slots, randomly mark ~40% booked
    const slots = [];
    for (let h = 10; h < 17; h++) {
      for (const m of [0, 30]) {
        if (h === 16 && m === 30) break;
        const ampm = h < 12 ? 'AM' : 'PM';
        const h12  = h <= 12 ? h : h - 12;
        const time = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
        slots.push({ time, available: Math.random() > 0.4 });
      }
    }
    // Guarantee ≥3 available
    let avail = slots.filter(s => s.available).length;
    for (let i = 0; i < slots.length && avail < 3; i++) {
      if (!slots[i].available) { slots[i].available = true; avail++; }
    }
    result.push({ date: dateStr, label, slots });
    daysAdded++;
  }
  res.json({ success: true, slots: result });
});

// ── POST /applicant/reschedule — book a slot ──────────────────────────────
router.post('/reschedule', (req, res) => {
  const { appId, slot } = req.body;
  if (!appId || !slot) {
    return res.status(400).json({ success: false, error: 'appId and slot required' });
  }
  // In production: update booking in DB and trigger notifications
  const bookingId = 'BK-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  res.json({ success: true, bookingId, slot, message: `Session rescheduled for ${slot}` });
});

module.exports = router;
