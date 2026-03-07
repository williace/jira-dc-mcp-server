#!/usr/bin/env bash
#
# Runs the full E2E test suite against a local Jira DC instance with the
# MCP server running alongside it.
#
# Infrastructure:
#   - PostgreSQL on port 5432
#   - Jira DC on port 8080
#   - MCP server on port 3001
#
# Usage:
#   ./scripts/e2e-local.sh              # full run: start → setup → seed → test → stop
#   ./scripts/e2e-local.sh --keep       # keep containers running after tests
#   ./scripts/e2e-local.sh --test-only  # skip setup, just run tests (Jira already running)
#
# Prerequisites:
#   - Docker and Docker Compose
#   - JIRA_LICENSE_KEY or JIRA_DC_LICENSE_KEY env var (Jira DC evaluation license)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/tests/e2e/docker-compose.yml"

KEEP=false
TEST_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --keep)      KEEP=true ;;
    --test-only) TEST_ONLY=true ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

cleanup() {
  if [ "$KEEP" = false ] && [ "$TEST_ONLY" = false ]; then
    echo "Stopping containers..."
    docker compose -f "$COMPOSE_FILE" down -v
  fi
}
trap cleanup EXIT

if [ "$TEST_ONLY" = false ]; then
  # Accept either JIRA_LICENSE_KEY or JIRA_DC_LICENSE_KEY (matches the GitHub secret name)
  JIRA_LICENSE_KEY="${JIRA_LICENSE_KEY:-${JIRA_DC_LICENSE_KEY:-}}"
  export JIRA_LICENSE_KEY
  if [ -z "$JIRA_LICENSE_KEY" ]; then
    echo "Error: JIRA_LICENSE_KEY (or JIRA_DC_LICENSE_KEY) env var is required."
    echo "This is the same value stored as JIRA_DC_LICENSE_KEY in the GitHub repo secrets."
    echo "Get a Jira DC evaluation license from https://my.atlassian.com/license/evaluation"
    exit 1
  fi

  # Start Jira + PostgreSQL first (MCP server starts after setup)
  echo "Starting PostgreSQL + Jira DC..."
  docker compose -f "$COMPOSE_FILE" up -d postgres jira

  # Wait for Jira to be ready
  echo "Waiting for Jira to start (this can take 3-10 minutes)..."
  JIRA_BASE_URL=http://localhost:8080 npx tsx "$PROJECT_DIR/tests/e2e/setup/wait-for-jira.ts"

  # Complete setup wizard (DB configuration is handled automatically by Docker ATL_JDBC_* env vars)
  echo "Running setup wizard..."
  JIRA_BASE_URL=http://localhost:8080 \
  JIRA_LICENSE_KEY="$JIRA_LICENSE_KEY" \
    npx tsx "$PROJECT_DIR/tests/e2e/setup/complete-setup-wizard.ts"

  # Seed test data (writes tests/e2e/.env.e2e with JIRA_BASE_URL, JIRA_PAT, etc.)
  echo "Seeding test data..."
  JIRA_BASE_URL=http://localhost:8080 \
  MCP_SERVER_URL=http://localhost:3001 \
    npx tsx "$PROJECT_DIR/tests/e2e/setup/seed-data.ts"

  # Now start the MCP server (admin account exists, auth will work)
  echo "Building and starting MCP server on port 3001..."
  docker compose -f "$COMPOSE_FILE" up -d --build mcp-server

  # Wait for MCP server health check
  echo "Waiting for MCP server to be ready..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
      echo "MCP server is ready."
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "Error: MCP server did not become healthy within 30s"
      docker compose -f "$COMPOSE_FILE" logs mcp-server
      exit 1
    fi
    sleep 1
  done
fi

# Build (mcp-server.test.ts spawns dist/index.js for stdio transport tests)
echo "Building..."
npm run build

# Run E2E tests (vitest.config.e2e.ts loads .env.e2e automatically)
echo "Running E2E tests..."
npm run test:e2e
