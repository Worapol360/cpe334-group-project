# ##############################################################################
# FeedbackLoop — Unified production Dockerfile (multi-stage)
# ##############################################################################
# WHAT THIS FILE DOES
#   Builds ONE image that contains the API (Express) AND the built React SPA and
#   serves both on port 3000. Cloud Run (and CI) build/run exactly this image.
#   (client/Dockerfile and server/Dockerfile are separate, used only by
#    docker-compose for local development.)
#
# STRUCTURE (3 stages)
#   Stage 1  client-builder -> compiles the frontend (Vite)
#   Stage 2  server-builder -> generates Prisma client with dependencies
#   Stage 3  production     -> unified production runtime image; runs as user `node`
#
# ⭐ IMPORTANT
#   * The container MUST listen on $PORT (Cloud Run injects it; 3000 here).
#   * Build from the repo root:  docker build .
#   * Secrets (DATABASE_URL, passwords) are NEVER baked into the image; they are
#     injected at runtime from Secret Manager.
#   * Stage 3 runs as the unprivileged `node` user (USER node).
#   * prisma/ is copied into the runtime image on purpose: the Cloud Run
#     migration job runs `prisma migrate deploy` + seed from this same image.
# ##############################################################################

# ============================================================================
# Stage 1: Build Frontend (React + Vite)
# ============================================================================
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ENV VITE_API_URL=""
RUN npm run build

# ============================================================================
# Stage 2: Prepare Backend Dependencies & Prisma
# ============================================================================
FROM node:24-alpine AS server-builder
WORKDIR /app/server
RUN apk add --no-cache openssl
COPY server/package*.json ./
RUN npm ci
COPY server/prisma ./prisma/
RUN npx prisma generate

# ============================================================================
# Stage 3: Unified Production Runtime (Serves API + Built React SPA on $PORT)
# ============================================================================
FROM node:24-alpine AS production
WORKDIR /app/server
RUN apk add --no-cache openssl

COPY --from=server-builder /app/server/package*.json ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/prisma ./prisma
COPY server/src ./src
COPY server/docker-entrypoint.sh ./docker-entrypoint.sh

# The built SPA is served by the Express server from /app/client/dist
COPY --from=client-builder /app/client/dist /app/client/dist

RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV APP_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=3000
EXPOSE 3000

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
