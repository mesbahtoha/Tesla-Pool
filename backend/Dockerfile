# ---- API image: Express + Prisma (Neon in cloud, local Postgres in compose) ----
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install deps first (cached layer). package-lock.json is committed.
# NOTE: full install (incl. devDeps) is deliberate — the compose entrypoint
# runs `npx prisma db push` at container boot, which needs the prisma CLI.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

COPY src ./src
COPY api ./api
COPY scripts ./scripts

EXPOSE 4000
# Container health: hit the public health endpoint with plain node (no curl in alpine).
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
