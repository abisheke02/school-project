# LD Support Platform

India-first AI-powered Learning Disability support platform for students, teachers, and parents.

---

## Project Structure

```
ld-platform/
├── backend/          Node.js + Express API
├── mobile/           React Native (Android-first)
├── web/              React.js teacher dashboard (PWA)
├── docker-compose.yml
└── .env.example
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| Docker + Docker Compose | Latest |
| Android Studio | For mobile emulator |
| React Native CLI | 0.73+ |

---

## Quick Start (Local Dev)

### 1. Clone and configure environment

```bash
cp .env.example .env
# Fill in your Firebase, Anthropic, and Google credentials in .env
```

### 2. Start database + Redis + backend + web dashboard

```bash
docker-compose up -d
```

This automatically:
- Starts PostgreSQL and runs the migration (`001_initial_schema.sql`)
- Starts Redis
- Starts the backend API on `http://localhost:3000`
- Starts the teacher web dashboard on `http://localhost:5173`

### 3. Verify everything is running

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"ld-platform-api"}
```

### 4. Run the mobile app (Android)

```bash
cd mobile
npm install
npx react-native run-android
```

---

## API Reference (Phase 1)

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Login via Firebase phone OTP token |
| POST | `/api/auth/logout` | Logout (blacklists JWT) |
| GET | `/api/auth/me` | Get current user from token |

### Students
| Method | Route | Description |
|---|---|---|
| POST | `/api/students/profile` | Set name, age, class after first login |
| POST | `/api/students/join-school` | Join class via 6-char code |
| GET | `/api/students/me` | Get own student profile |
| GET | `/api/students/:id` | Teacher views a student (teacher/admin only) |
| POST | `/api/students/activity` | Log daily practice session stats |

### Schools
| Method | Route | Description |
|---|---|---|
| POST | `/api/schools` | Create school (admin only) |
| POST | `/api/schools/classes` | Teacher creates a class (generates join code) |
| GET | `/api/schools/classes` | Teacher gets their classes |
| GET | `/api/schools/classes/:classId/students` | Teacher views class roster |

---

## Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Phone Authentication** under Authentication → Sign-in method
3. Add India (+91) to allowed countries
4. Download the **Admin SDK service account JSON** → paste values into `.env`
5. Register your Android app → download `google-services.json` → place in `mobile/android/app/`
6. Register your Web app → paste web config into `.env` (VITE_FIREBASE_* vars)

---

## Database

All tables are created by `backend/migrations/001_initial_schema.sql`.

Key tables:
- `users` — all roles (student/teacher/parent/admin)
- `students` — extended student profile (LD type, risk score, level)
- `schools` + `classes` + `class_students` — school structure
- `student_errors` — every wrong answer (feeds AI nightly job)
- `daily_stats` — one row per student per day (core reporting unit)
- `ai_recommendations` — Claude API outputs stored per user

---

## Build Phases

| Phase | Weeks | What gets built |
|---|---|---|
| 1 (current) | 1–3 | Auth, profiles, school join, DB |
| 2 | 4–6 | LD screening quiz + Claude classification |
| 3 | 7–11 | Practice engine, TTS/STT, mistake storage |
| 4 | 12–15 | 5-level tests + AI recommendations |
| 5 | 16–19 | Full dashboards + push notifications |
| 6 | 20–24 | Razorpay payments + Play Store launch |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.73 (Android-first) |
| Web | React 18 + Vite + Tailwind CSS |
| Backend | Node.js 20 + Express |
| Database | PostgreSQL 16 (AWS RDS in production) |
| Cache | Redis 7 |
| AI/LLM | Claude API (claude-sonnet-4-6) |
| Auth | Firebase Auth (phone OTP) |
| TTS/STT | Google Cloud TTS + STT |
| Push | Firebase FCM |
| Payments | Razorpay (Phase 6) |
| Hosting | AWS Mumbai ap-south-1 |
