# Duo Life SMS Webhook Receiver

This service receives Android Tasker SMS payloads and writes parsed expenses into Firestore.

Flow:

Android automation -> webhook -> Firestore -> Duo Life app realtime updates

## 1) Install

```bash
cd webhook-server
npm install
```

## 2) Environment variables

Set these before running:

- `WEBHOOK_TOKEN` (required): shared secret used by Tasker and webhook
- `GOOGLE_APPLICATION_CREDENTIALS` (recommended): path to Firebase service account JSON file
- OR `FIREBASE_SERVICE_ACCOUNT_JSON`: full JSON string of service account
- OR `FIREBASE_SERVICE_ACCOUNT_JSON_B64`: base64-encoded service account JSON
- `PORT` (optional): defaults to `8787`

## 3) Run locally

```bash
npm run test
npm run dev
```

## 4) Endpoint

`POST /webhook/tasker/sms`

Headers:

- `Content-Type: application/json`
- `x-webhook-token: <WEBHOOK_TOKEN>`

Minimal payload:

```json
{
  "groupId": "YOUR_GROUP_ID",
  "rawSms": "Rs.250 debited from A/c XX1234 at Zomato on 17-06-2026",
  "sender": "AX-SBIUPI",
  "timestamp": "2026-06-17T20:05:00+05:30",
  "deviceName": "MyAndroid"
}
```

Optional payload fields:

- `amount`, `merchant`, `description`, `category`, `date`, `paidBy`, `deviceId`, `sms`, `message`

If `amount`, `merchant`, or `category` are missing, the server tries to infer them from `rawSms`.

## 5) Android Tasker setup

1. Profile -> Event -> Phone -> Received Text
2. Task -> Net -> HTTP Request
3. Configure:
   - Method: `POST`
   - URL: `https://<your-webhook-host>/webhook/tasker/sms`
   - Headers:
     - `Content-Type: application/json`
     - `x-webhook-token: YOUR_SECRET_TOKEN`
   - Body (JSON):

```json
{
  "groupId": "YOUR_GROUP_ID",
  "rawSms": "%SMSRB",
  "sender": "%SMSRF",
  "timestamp": "%TIMES",
  "deviceName": "%DEVNAME",
  "deviceId": "%DEVID"
}
```

Use Tasker filtering so only debit/payment bank SMS trigger the webhook.

## 6) Deploy options (no Blaze)

Deploy this folder to any Node host:

- Render
- Railway
- Fly.io
- VPS

After deploy, keep `WEBHOOK_TOKEN` secret and use HTTPS only.

## 7) Render deployment (recommended)

This repo includes `render.yaml` at the project root.

1. Push this code to GitHub.
2. In Render, choose **New +** -> **Blueprint**.
3. Select your repository and create services from `render.yaml`.
4. Open the created service and set env vars:
   - `WEBHOOK_TOKEN`: your own strong secret (override generated value if needed)
  - `FIREBASE_SERVICE_ACCOUNT_JSON_B64`: base64-encoded Firebase service account JSON
5. Deploy, then copy your Render URL.

Webhook URL format:

- `https://<your-render-service>.onrender.com/webhook/tasker/sms`

Health check:

- `https://<your-render-service>.onrender.com/health`

### Quick test after deploy

```bash
curl -X POST "https://<your-render-service>.onrender.com/webhook/tasker/sms" \
  -H "content-type: application/json" \
  -H "x-webhook-token: <WEBHOOK_TOKEN>" \
  -d '{
    "groupId":"YOUR_GROUP_ID",
    "rawSms":"Rs.349 debited from A/c XX1234 at Amazon on 17-06-2026",
    "sender":"VM-HDFCBK",
    "timestamp":"2026-06-17T20:05:00+05:30",
    "deviceName":"MyAndroid"
  }'
```

Expected response:

```json
{
  "ok": true,
  "id": "<firestore-doc-id>",
  "amount": 349,
  "date": "2026-06-17",
  "category": "shopping"
}
```

### Convert the Firebase service account JSON to base64

PowerShell:

```powershell
$json = Get-Content .\serviceAccountKey.json -Raw
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
```

Paste the output into `FIREBASE_SERVICE_ACCOUNT_JSON_B64`.
