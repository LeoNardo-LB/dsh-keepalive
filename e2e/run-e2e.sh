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
node /e2e/mock-provider.mjs 9203 spare ok >/e2e/evidence/mock-spare.log 2>&1 &
MOCK_SPARE=$!
sleep 1
curl -sf http://127.0.0.1:9201/__mode >/dev/null && curl -sf http://127.0.0.1:9202/__mode >/dev/null && curl -sf http://127.0.0.1:9203/__mode >/dev/null \
  || { echo 'mocks failed to start' >&2; exit 1; }

echo '=== [3/5] boot dsh web ==='
export MOCK_PRIMARY_KEY=mock-primary-key
export MOCK_BACKUP_KEY=mock-backup-key
export MOCK_SPARE_KEY=mock-spare-key
export DSH_HOME=/e2e/dsh-home
dsh web --patch /e2e/e2e-overlay.yml --host 127.0.0.1 --port 8180 >/e2e/evidence/dsh-web.log 2>&1 &
DSH_WEB=$!
trap 'kill $DSH_WEB $MOCK_PRIMARY $MOCK_BACKUP $MOCK_SPARE 2>/dev/null || true' EXIT

echo '=== [4/6] driver ==='
set +e
node /e2e/driver.mjs
DRIVER_EXIT=$?
set -e

echo '=== [5/6] browser check (new primitives UI) ==='
set +e
node /e2e/browser-check.mjs
BROWSER_EXIT=$?
set -e

echo '=== [6/6] storage dump + dsh log tail ==='
echo '--- storage files ---'
find "$DSH_HOME/storages" -type f 2>/dev/null | head -8 || true
for f in $(find "$DSH_HOME/storages" -type f -name '*.json' 2>/dev/null | head -4); do
  echo "--- $f (first 600B)"
  head -c 600 "$f" || true
  echo
done
echo '--- dsh log tail ---'
tail -n 30 /e2e/evidence/dsh-web.log || true

[ "$DRIVER_EXIT" -eq 0 ] && [ "$BROWSER_EXIT" -eq 0 ] || exit 1
exit 0
