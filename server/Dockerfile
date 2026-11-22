# ==============================================================================
# FeedbackLoop — Backend Dockerfile for local Docker Compose (server + migrate)
# ==============================================================================
# Used by docker-compose.yml (`server` and `migrate` services).
# Cloud Run does NOT use this file — Cloud Run uses the root `Dockerfile`.
# ==============================================================================

FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache openssl

# --- Install dependencies -----------------------------------------------------
COPY package*.json ./
RUN npm ci

# --- Generate Prisma client ---------------------------------------------------
COPY prisma ./prisma/
RUN npx prisma generate

# --- Copy source code and entrypoint ------------------------------------------
COPY src ./src/
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# --- Runtime settings ---------------------------------------------------------
ENV NODE_ENV=production
ENV APP_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=3000
EXPOSE 3000

# Run as non-root user
USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
