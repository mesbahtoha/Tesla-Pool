# Tesla Pool API (Express + Prisma + Postgres)

REST API for the Dhaka Tesla Pool MVP. See the root `../README.md` for the full picture
(architecture, ERD, fare model, matching rule, lifecycle, deployment).

## Quick start (local, Neon)

```bash
cp .env.example .env     # DATABASE_URL (Neon pooled) + JWT_SECRET
npm install
npx prisma db push       # sync schema (MVP; `prisma migrate` for teams)
npm run db:seed          # Jashim + Bullet + Nusrat/Rafiq pooled + Shirin waiting
npm run dev              # http://localhost:4000
```

## Scripts

| Script | What |
|---|---|
| `npm run dev` / `npm start` | run the API (`src/server.js`) |
| `npx prisma db push` | sync schema to `DATABASE_URL` |
| `npm run db:seed` | idempotent demo seed (story cast) |
| `npx vitest run` | unit + API tests |
| `npm run smoke` | full-lifecycle live test (needs server running; self-cleaning) |
| `npm run race` | 1-seat claim race: exactly one winner, capacity never exceeded |
| `node scripts/clean.js <email\|prefix%>` | remove temp users + return pool seats |

## Deploy — Vercel

Import this folder; `vercel.json` routes all traffic to `api/index.js`
(serverless Express). Env: `DATABASE_URL` (Neon pooled), `JWT_SECRET`.
Frontend needs `NEXT_PUBLIC_API_URL` pointing here.

## Deploy — Docker

From repo root: `docker compose up --build` (Postgres 16 + api + web).
The api entrypoint runs `prisma db push`, optional seed (`SEED_DEMO`), then serves.

## Concurrency note

`POST /api/pools/:id/join` wraps the seat claim in an interactive transaction with
`SELECT … FOR UPDATE` on the pool row (`TX_OPTS = { timeout: 20000 }` — remote-Neon
friendly). Losers get `409 Pool is full`. See Concurrency in the root README.
