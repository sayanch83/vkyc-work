# VKYC API — Video KYC Backend

RBI V-CIP Video KYC REST API. Built with Express.js.  
Consumed by the `vkyc-ui` Stencil web components frontend.

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/agent/cases` | All agent dashboard cases |
| GET | `/api/v1/agent/cases/:id` | Single case |
| POST | `/api/v1/agent/cases/:id/accept` | Start a session |
| POST | `/api/v1/agent/sessions/:sid/liveness` | Run in-session liveness |
| POST | `/api/v1/agent/sessions/:sid/face-match` | Face capture + match |
| POST | `/api/v1/agent/sessions/:sid/ocr` | Run OCR |
| POST | `/api/v1/agent/sessions/:sid/decision` | Approve or Reject |
| POST | `/api/v1/applicant/consent` | Record consents |
| GET | `/api/v1/applicant/queue/:appId` | Queue position |
| POST | `/api/v1/applicant/liveness` | Pre-session liveness result |
| GET | `/api/v1/applicant/slots` | Available reschedule slots |
| POST | `/api/v1/applicant/reschedule` | Book a slot |
| GET | `/api/v1/auditor/cases` | Audit queue |
| GET | `/api/v1/auditor/cases/:id` | Single audit case |
| POST | `/api/v1/auditor/cases/:id/decision` | Auditor approve/reject |

---

## Local Development

```bash
git clone https://github.com/YOUR_ORG/vkyc-api.git
cd vkyc-api
npm install
cp .env.example .env
npm run dev        # http://localhost:3001
```

Test it:
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/agent/cases
```

---

## Deploy to Railway (recommended — free tier available)

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select `vkyc-api`
3. Railway auto-detects Node.js and sets `PORT` — no config needed
4. Copy the generated URL (e.g. `https://vkyc-api.railway.app`)
5. Set this URL as `VKYC_API_BASE` secret in the `vkyc-ui` GitHub repo

## Deploy to Render (alternative)

1. Go to [render.com](https://render.com) → **New → Web Service → Connect repo**
2. Build command: `npm install`
3. Start command: `node src/index.js`
4. Copy the URL and set as `VKYC_API_BASE` in `vkyc-ui`

---

## Environment Variables

```bash
PORT=3001
ALLOWED_ORIGINS=http://localhost:3333,https://YOUR_USERNAME.github.io
```

---

## Production Integration Points

Replace each simulation stub with a real service:

| File | Method | Replace with |
|---|---|---|
| `routes/agent.js` | `runLiveness` | FaceTec / iProov SDK |
| `routes/agent.js` | `runFaceMatch` | Digilocker API + face SDK |
| `routes/agent.js` | `runOCR` | AWS Textract / Google Document AI |
| `routes/applicant.js` | `getQueuePos` | Redis queue |
| `mock/data.js` | `MOCK_CASES` | PostgreSQL / MongoDB |
