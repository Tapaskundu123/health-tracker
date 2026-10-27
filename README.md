# HabitFlow — Full-Stack Habit Tracker

A beautiful, full-stack habit tracker with flexible scheduling, streak tracking, calendar heatmaps, and stats.

---

## Demo Logins

| Email | Password |
|---|---|
| `demo@habits.com` | `Demo1234!` |
| `test@habits.com` | `Test1234!` |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + React, Vanilla CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (own backend) |
| Tests | Jest (20 unit tests) |

---

## Features

- ✅ **Habits with schedules** — every day, specific weekdays, or N times per week
- ✅ **Check off today or last 7 days** — with one click from the dashboard
- ✅ **Smart streaks** — current & longest, respecting each habit's schedule (Mon/Wed/Fri habit won't break on Tuesday)
- ✅ **Calendar heatmap** — 6 months of activity per habit
- ✅ **Stats page** — 30-day completion rate per habit
- ✅ **Archive & restore** — habits retain full history
- ✅ **Responsive** — works on phones and laptops
- ✅ **Timezone aware** — uses the user's browser timezone, not the server's

---

## Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd health-tracker

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Set up Supabase (free)

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In the Supabase dashboard: **Settings → Database → Connection string → URI**
3. Copy the connection string

### 3. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

### 4. Run schema + seed

The schema is applied automatically on first server start.

To seed demo data:
```bash
cd backend
npm run seed
```

### 5. Start the servers

**Backend** (terminal 1):
```bash
cd backend
npm run dev
# → http://localhost:4000
```

**Frontend** (terminal 2):
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## Running Tests

```bash
cd backend
npm test
```

20 tests covering:
- Daily streaks (unbroken, broken, multiple runs)
- Weekday streaks (non-scheduled days don't break streak)
- Times-per-week streaks (weekly quota logic)
- Longest streak calculation
- Completion rate (all schedule types)

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |

### Habits
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/habits` | List habits |
| POST | `/api/habits` | Create habit |
| PUT | `/api/habits/:id` | Update habit |
| DELETE | `/api/habits/:id` | Delete habit |
| POST | `/api/habits/:id/archive` | Archive habit |
| POST | `/api/habits/:id/restore` | Restore habit |

### Completions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/habits/:id/completions` | Get completions + streaks |
| POST | `/api/habits/:id/completions/complete` | Mark complete |
| DELETE | `/api/habits/:id/completions/complete/:date` | Unmark |

### Stats
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats?today=YYYY-MM-DD` | 30-day rates |

---

## Project Structure

```
health-tracker/
├── backend/
│   ├── src/
│   │   ├── db/        # Schema, seed, pool
│   │   ├── middleware/ # Auth, validation
│   │   ├── routes/    # auth, habits, completions, stats
│   │   └── utils/     # streaks.js ← core logic
│   ├── tests/
│   │   └── streaks.test.js
│   └── index.js
└── frontend/
    └── src/
        ├── api/       # Axios client + services
        ├── components/ # HabitCard, HabitModal, Heatmap, etc.
        ├── hooks/     # useAuth
        └── pages/     # Dashboard, HabitDetail, Stats, Archive
```

---

## Environment Variables

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `PORT` | | Server port (default: 4000) |
| `NODE_ENV` | | `development` or `production` |
| `CORS_ORIGIN` | | Frontend URL for CORS |
