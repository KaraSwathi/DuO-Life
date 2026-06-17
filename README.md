# 💞 DuoLife — Shared Daily Tracker PWA

A production-ready Progressive Web App for two people to track **routines**, **health/diet**, and **expenses** together — built with React + Vite + Firebase.

---

## ✨ Features

| Module | What it does |
|--------|-------------|
| **Auth** | Email/password signup with automatic group creation. Invite your partner via a shareable link. |
| **Routines** | Real-time shared task list scoped to `groupId`. Tap to check off, add, or delete. Progress bar shows group completion %. |
| **Health → Meals** | Log Breakfast / Lunch / Dinner / Snacks with calorie tracking. Daily total shown on dashboard. |
| **Health → Weight** | Log daily weight (kg or lbs). Persistent history sorted by date. |
| **Health → Water** | 8-glass tracker with tap-to-fill bubbles. |
| **Expenses** | Shared live feed from Firestore. Group members can add entries directly. Grouped by date with totals. |
| **PWA** | Installable on iOS/Android/desktop via `vite-plugin-pwa`. Offline-capable with Workbox. |
| **Dashboard** | Summary of all modules at a glance with quick navigation. |

---

## 🚀 Setup

### 1 — Prerequisites

```bash
node >= 18
npm >= 9
```

### 2 — Clone and install

```bash
git clone <your-repo-url>
cd duo-life
npm install
```

### 3 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (disable Google Analytics if not needed)
3. **Authentication** → Sign-in method → Enable **Email/Password**
4. **Firestore** → Create database → Start in **production mode** → pick a region
5. **Project Settings** → Your Apps → Add a **Web app** → copy the config values

### 4 — Configure environment variables

```bash
cp .env.example .env
# Fill in the values from your Firebase project settings
```

### 5 — Deploy Firestore rules and indexes

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # select your project
firebase deploy --only firestore
```

Or manually:
- Paste `firestore.rules` into **Firebase Console → Firestore → Rules**
- Paste `firestore.indexes.json` into **Firebase Console → Firestore → Indexes**

### 6 — Generate PWA icons

```bash
# Option A: use the helper script (needs sharp)
npm install -D sharp
node scripts/generate-icons.js

# Option B: manually place these two files:
#   public/icons/icon-192.png
#   public/icons/icon-512.png
# Use https://realfavicongenerator.net or Figma to export.
```

### 7 — Run locally

```bash
npm run dev
# Open http://localhost:5173
```

### 8 — Build and deploy to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

---

## 📐 Firestore Data Schema

### `users/{uid}`
```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "groupId": "string",
  "createdAt": "Timestamp"
}
```


### `groups/{groupId}`
```json
{
  "members": { "uid1": "Alice", "uid2": "Bob" },
  "updatedAt": "Timestamp"
}
```

### `routines/{routineId}`
```json
{
  "taskName": "Morning yoga",
  "date": "2025-01-15",
  "isCompleted": false,
  "assignedTo": "uid | 'partner' | 'both'",
  "groupId": "string",
  "createdBy": "uid",
  "createdAt": "Timestamp"
}
```

### `healthLogs/{logId}`

**Meal entry:**
```json
{
  "userId": "uid",
  "date": "2025-01-15",
  "type": "meal",
  "mealType": "Breakfast | Lunch | Dinner | Snacks",
  "description": "Oats with banana",
  "calories": 350,
  "createdAt": "Timestamp"
}
```

**Weight entry** (docId: `{uid}_weight_{date}`):
```json
{
  "userId": "uid",
  "date": "2025-01-15",
  "type": "weight",
  "weight": 68.5,
  "unit": "kg"
}
```

**Water entry** (docId: `{uid}_water_{date}`):
```json
{
  "userId": "uid",
  "date": "2025-01-15",
  "type": "water",
  "glasses": 6
}
```

### `expenses/{expenseId}`
```json
{
  "groupId": "string",
  "date": "2025-01-15",
  "amount": 250.00,
  "description": "Lunch at cafe",
  "category": "food | transport | groceries | health | entertainment | shopping | bills | other",
  "merchant": "The Coffee House",
  "paidBy": "Alice",
  "createdAt": "Timestamp"
}
```

---

## 🔗 Expense Entry

Expenses can be added directly in the app from the **Expenses** page.

- Group members can create entries in Firestore.
- The app stores the expense with the current day, amount, category, merchant, and payer.
- The live feed updates automatically for everyone in the group.

### SMS automation (Android Tasker -> webhook -> Firestore)

For automatic expense tracking from bank/payment SMS, use the webhook receiver in `webhook-server/`.

- Receiver docs and Tasker payload format: `webhook-server/README.md`
- Local parser test: `cd webhook-server && npm run test`
- Webhook endpoint (after deploy): `POST /webhook/tasker/sms`

---

## 👫 Inviting Your Partner

1. Sign up first — your `uid` becomes the `groupId`
2. Go to **Dashboard** → tap **🔗 Invite**
3. Share the copied link: `https://your-app.web.app/signup?group=YOUR_GROUP_ID`
4. Your partner signs up via that link and is automatically joined to your group

---

## 🔒 Security Rules Summary

| Collection | Who can read | Who can write |
|------------|-------------|---------------|
| `users` | Owner only | Owner only |
| `groups` | Group members | Group members |
| `routines` | Group members | Group members |
| `healthLogs` | Log owner only | Log owner only |
| `expenses` | Group members | Backend/Admin SDK only |

---

## 📱 PWA Installation

**iOS Safari**: Share → Add to Home Screen  
**Android Chrome**: Install app prompt, or ⋮ menu → Add to Home Screen  
**Desktop Chrome**: Click the install icon in the address bar

---

## 🗂 Project Structure

```
duo-life/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── favicon.svg
│   └── icons/                 # icon-192.png, icon-512.png (generate with script)
├── src/
│   ├── lib/
│   │   └── firebase.js        # Firebase init
│   ├── hooks/
│   │   └── useAuth.jsx        # Auth context + provider
│   ├── styles/
│   │   └── global.css         # Design tokens + all component styles
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   └── SignupPage.jsx
│   │   ├── shared/
│   │   │   ├── AppShell.jsx   # Bottom nav + layout wrapper
│   │   │   └── Toast.jsx      # Toast notification system
│   │   ├── routines/
│   │   │   └── RoutinesPage.jsx
│   │   ├── health/
│   │   │   └── HealthPage.jsx # Meals + Weight + Water tabs
│   │   ├── expenses/
│   │   │   └── ExpensesPage.jsx
│   │   └── Dashboard.jsx
│   ├── App.jsx                # Router + routes
│   └── main.jsx               # Entry point
├── firestore.rules            # Security rules
├── firestore.indexes.json     # Composite indexes
├── firebase.json              # Firebase CLI config
├── vite.config.js             # Vite + PWA plugin
├── .env.example               # Environment variable template
└── scripts/
    └── generate-icons.js      # PWA icon generator
```
