# Tesla Pool Web (Next.js 14 App Router)

Passenger + driver web app. See the root `../README.md` for the full picture.

## Quick start

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
```

## Routes

| Route | Who | What |
|---|---|---|
| `/` | public | Landing + demo cast credentials |
| `/login` `/signup` | public | JWT session (localStorage) |
| `/passenger` | passenger | Request seat, live trips, cancel, wallet top-up |
| `/driver` | driver | Tesla register, online toggle, accept → pool, advance lifecycle |
| `/pools/[id]` | member/driver | Seats, fares (privacy-scoped), timeline |
| `/history` | all | Unified ride + pool history |

## Deploy — Vercel

Import this folder, set `NEXT_PUBLIC_API_URL` to the API URL, deploy. No config needed.

## Deploy — Docker

From repo root: `docker compose up --build`. The image uses Next `standalone`
output; the API URL is baked via `PUBLIC_API_URL` build arg.
