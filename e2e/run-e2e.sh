#!/usr/bin/env bash
# In-container E2E orchestration: setup -> mocks -> dsh web -> driver.
set -euo pipefail
cd /e2e

echo '=== [1/5] profile setup ==='
bash /e2e/setup-profile.sh

echo '=== [2/5] mock providers ==='
node /e2e/mock-provider.mjs 9201 primary ok >/e2e/evidence/mock-primary.log 2>&1 &
MOCK_PRIMARY=$!
node /e2e/mock-provider.mjs 9202 backup ok >/e2e/evidence/mock-backup.log 2>&1 &
MOCK_BACKUP=$!
sleep 1
curl -sf http://127.0.0.1:9201/__mode >/dev/null && curl -sf http://127.0.0.1:9202/__mode >/dev/null \
  || { echo 'mocks failed to start' >&2; exit 1; }

echo '=== [3/5] boot dsh web ==='
export MOCK_PRIMARY_KEY=mock-primary-key
export MOCK_BACKUP_KEY=mock-backup-key
export DSH_HOME=/e2e/dsh-home
dsh web --patch /e2e/e2e-overlay.yml --host 127.0.0.1 --port 8180 >/e2e/evidence/dsh-web.log 2>&1 &
DSH_WEB=$!
trap 'kill $DSH_WEB $MOCK_PRIMARY $MOCK_BACKUP 2>/dev/null || true' EXIT

echo '=== [4/5] driver ==='
set +e
node /e2e/driver.mjs
DRIVER_EXIT=$?
set -e

echo '=== [5/5] dsh log tail ==='
tail -n 30 /e2e/evidence/dsh-web.log || true

exit $DRIVER_EXIT
