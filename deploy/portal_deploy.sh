#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# One-shot build, migrate, and deploy script for CPE 334 Course Cloud Portal
# ==============================================================================
PROJECT_ID="${PROJECT_ID:-cpe-se-course-2026}"
REGION="${REGION:-asia-southeast1}"
PREFIX="${PREFIX:-s3ed50763}"
REPO_NAME="${REPO_NAME:-$PREFIX}"
SERVICE_NAME="${SERVICE_NAME:-$PREFIX}"
MIGRATE_JOB_NAME="${MIGRATE_JOB_NAME:-$PREFIX-migrate}"

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse HEAD 2>/dev/null || echo 'v1')}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

echo "=================================================================="
echo "FeedbackLoop Course Portal Deployment"
echo "Project  : ${PROJECT_ID}"
echo "Region   : ${REGION}"
echo "Prefix   : ${PREFIX}"
echo "Image URI: ${IMAGE_URI}"
echo "=================================================================="

gcloud config set project "${PROJECT_ID}"

echo ""
echo ">>> Step 1/3: Building and pushing image via Cloud Build..."
gcloud builds submit --tag "${IMAGE_URI}" --project "${PROJECT_ID}"

echo ""
echo ">>> Step 2/3: Updating and executing migration job (${MIGRATE_JOB_NAME})..."
gcloud run jobs update "${MIGRATE_JOB_NAME}" \
  --image "${IMAGE_URI}" \
  --command "sh" \
  --args "-c,npx prisma migrate deploy && npm run prisma:seed" \
  --region "${REGION}" \
  --project "${PROJECT_ID}"

gcloud run jobs execute "${MIGRATE_JOB_NAME}" \
  --wait \
  --region "${REGION}" \
  --project "${PROJECT_ID}"

echo ""
echo ">>> Step 3/3: Updating Cloud Run service (${SERVICE_NAME})..."
gcloud run services update "${SERVICE_NAME}" \
  --image "${IMAGE_URI}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}"

echo ""
echo "=================================================================="
echo "Deployment successful!"
gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format="table(status.url, status.latestReadyRevisionName)"
echo "Health check endpoint: $(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --project "${PROJECT_ID}" --format='value(status.url)')/api/health"
echo "=================================================================="
