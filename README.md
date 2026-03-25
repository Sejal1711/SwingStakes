# DigiHeroes

**Play. Give. Win.**

A subscription-driven web app combining golf performance tracking, charity fundraising, and a monthly draw-based reward engine.

---

## Project Overview

DigiHeroes lets golfers:

1. **Track** every round using Stableford scoring — monitor handicap trends and performance over time.
2. **Give** — part of every subscription is donated to the member's chosen charity.
3. **Win** — every round logged earns entries into a monthly prize draw.

---

## Tech Stack

| Layer     | Technology                                 |
|-----------|---------------------------------------------|
| Frontend  | React 18, Vite 5, Tailwind CSS, shadcn/ui  |
| Backend   | Node.js, Express.js                         |
| Database  | Supabase (PostgreSQL + Auth + RLS)          |
| Payments  | Stripe (subscriptions)                      |
| Animation | Framer Motion                               |

---

## Project Structure

```
digiheroes/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui components
│   │   ├── pages/          # Route-level page components
│   │   ├── lib/            # Utilities (cn, supabase client)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # React context (AuthContext)
│   │   └── assets/         # Static assets
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                # Express.js API
│   ├── src/
│   │   ├── routes/         # Express routers
│   │   ├── controllers/    # Route handler logic
│   │   ├── middleware/     # Auth, error handler
│   │   ├── services/       # Supabase admin client
│   │   └── utils/          # Response helpers
│   └── package.json
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (for subscriptions)

---

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migration file:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Note your **Project URL**, **Anon Key**, and **Service Role Key** from Project Settings > API.

---

### 2. Backend Setup

```bash
cd backend

# Copy and fill in environment variables
cp .env.example .env
```

Edit `.env`:
```env
PORT=4000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=a_long_random_string
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The API will be available at `http://localhost:4000`.

---

### 3. Frontend Setup

```bash
cd frontend

# Copy and fill in environment variables
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## API Endpoints

### Auth
| Method | Endpoint            | Auth | Description                  |
|--------|---------------------|------|------------------------------|
| POST   | /api/auth/register  | No   | Create a new user account    |
| POST   | /api/auth/login     | No   | Sign in with email/password  |
| POST   | /api/auth/logout    | Yes  | Sign out                     |
| POST   | /api/auth/refresh   | No   | Refresh session token        |
| GET    | /api/auth/me        | Yes  | Get current user + profile   |

### Scores
| Method | Endpoint              | Auth | Description                  |
|--------|-----------------------|------|------------------------------|
| GET    | /api/scores           | Yes  | List all scores (paginated)  |
| POST   | /api/scores           | Yes  | Log a new round              |
| GET    | /api/scores/stats     | Yes  | Get aggregated stats         |
| GET    | /api/scores/:id       | Yes  | Get a specific score         |
| PATCH  | /api/scores/:id       | Yes  | Update a score               |
| DELETE | /api/scores/:id       | Yes  | Delete a score               |

### Subscriptions
| Method | Endpoint                          | Auth | Description                   |
|--------|-----------------------------------|------|-------------------------------|
| GET    | /api/subscriptions/me             | Yes  | Get current subscription      |
| POST   | /api/subscriptions/create-checkout| Yes  | Create Stripe checkout session|
| POST   | /api/subscriptions/webhook        | No   | Stripe webhook receiver       |
| DELETE | /api/subscriptions/cancel         | Yes  | Cancel at period end          |

### Draws
| Method | Endpoint                    | Auth | Description                  |
|--------|-----------------------------|------|------------------------------|
| GET    | /api/draws                  | Yes  | List all draws               |
| GET    | /api/draws/current          | Yes  | Get the open draw            |
| GET    | /api/draws/:id              | Yes  | Get a specific draw          |
| GET    | /api/draws/:id/my-entries   | Yes  | Get user entries for a draw  |

### Charity
| Method | Endpoint              | Auth | Description                   |
|--------|-----------------------|------|-------------------------------|
| GET    | /api/charity          | No   | List all active charities     |
| GET    | /api/charity/my-charity| Yes | Get user's chosen charity     |
| POST   | /api/charity/select   | Yes  | Select or change charity      |

---

## Frontend Routes

| Path         | Component   | Protected |
|--------------|-------------|-----------|
| `/`          | Home        | No        |
| `/login`     | Login       | No        |
| `/register`  | Register    | No        |
| `/dashboard` | Dashboard   | Yes       |
| `/scores`    | Scores      | Yes       |
| `/prizes`    | Prizes      | Yes       |
| `/charity`   | Charity     | Yes       |

---

## Database Schema

| Table           | Description                                      |
|-----------------|--------------------------------------------------|
| `profiles`      | Extended user profile (username, handicap)       |
| `subscriptions` | Stripe subscription state per user               |
| `golf_scores`   | Stableford rounds logged by users                |
| `charities`     | Curated list of supported charities              |
| `user_charities`| User → charity selection (one per user)          |
| `monthly_draws` | Monthly prize draw metadata                      |
| `draw_entries`  | Entries per user per draw                        |

All tables have Row Level Security enabled.

---

## Subscription Plans

| Plan    | Price    | Draw Entries per Round |
|---------|----------|------------------------|
| Monthly | £9.99/mo | 1                      |
| Annual  | £89.99/yr| 2                      |

---

## Development Notes

- The `@` path alias resolves to `./src` in the frontend.
- The backend serves on port `4000`; the frontend proxies `/api/*` calls to it.
- Supabase Auth tokens are passed as `Authorization: Bearer <token>` headers.
- The Stripe webhook endpoint requires raw request body — this is configured before `express.json()` in `src/index.js`.
- Run `stripe listen --forward-to localhost:4000/api/subscriptions/webhook` locally to test webhooks.
