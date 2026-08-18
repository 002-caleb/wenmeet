# WenMeet — multi-stage Dockerfile, standalone Next.js output.
# Kept independent of Netlify's build pipeline (PRD §15): the same image
# built here can run on Netlify, a generic container host, or locally.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Production containers must set DATA_STORE=supabase — the in-memory
# NebulaStore does not persist across restarts/cold starts.
ENV DATA_STORE=supabase

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
