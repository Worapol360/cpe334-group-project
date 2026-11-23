# ==============================================================================
# FeedbackLoop — Frontend Dockerfile for local Docker Compose (Vite + nginx)
# ==============================================================================
# Used by docker-compose.yml (`client` service on http://localhost:5173).
# Cloud Run does NOT use this file — Cloud Run serves the built SPA from the
# root `Dockerfile`.
# ==============================================================================

# --- Stage 1: Build static frontend files -------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# --- Stage 2: Serve built files with nginx (proxies /api -> server:3000) ------
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
