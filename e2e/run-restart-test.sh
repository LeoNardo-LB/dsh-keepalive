#!/usr/bin/env bash
# Catch-up restart test: boot dsh web, wait for a scheduled nextFireAt, kill
# dsh ONLY (mocks keep running), wait past the deadline, restart dsh with the
# same DSH_HOME, and assert EXACTLY ONE catch-up shot arrived after boot.
set -euo pipefail
cd /e2e

bash /e2e/setup-profile.sh

node /e2e/mock-provider.mjs 9201 primary ok >/e2e/evidence/mock-primary.log 2>&1 &
node /e2e/mock-provider.mjs 9202 backup ok >/e2e/evidence/mock-backup.log 2>&1 &
MOCK_PRIMARY=$!
MOCK_BACKUP=$!
sleep 1
curl -sf http://127.0.0.1:9201/__mode >/dev/null || { echo 'mocks failed' >&2; exit 1; }

export MOCK_PRIMARY_KEY=mock-primary-key
export MOCK_BACKUP_KEY=mock-backup-key
export DSH_HOME=/e2e/dsh-home

dsh web --patch /e2e/e2e-overlay.yml --host 127.0.0.1 --port 8181 >/e2e/evidence/restart-web-1.log 2>&1 &
WEB1=$!
trap 'kill $WEB1 $MOCK_PRIMARY $MOCK_BACKUP 2>/dev/null || true' EXIT

# Wait for scheduling info.
for _ in $(seq 1 60); do
  NEXT=$(curl -sf http://127.0.0.1:8181/plugins/dsh-keepalive/status | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const r=j.providers.find(p=>p.id==='mock-primary');console.log(r&&r.nextFireAt?r.nextFireAt:'0')})" || echo 0)
  [ "$NEXT" != "0" ] && [ -n "$NEXT" ] && break
  sleep 1
done
echo "nextFireAt=$NEXT"
[ "$NEXT" != "0" ] || { echo 'FAIL: no schedule appeared' >&2; exit 1; }

kill $WEB1
wait $WEB1 2>/dev/null || true
echo "dsh stopped; sleeping past deadline"
# Sleep until the deadline passed by 20s.
NOW_MS=$(date +%s%3N)
DEADLINE=$NEXT
PAST=$(( DEADLINE - NOW_MS + 20000 ))
if [ "$PAST" -gt 0 ]; then sleep $(( PAST / 1000 + 1 )); fi

BEFORE=$(curl -sf http://127.0.0.1:9201/__log | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).length))")

dsh web --patch /e2e/e2e-overlay.yml --host 127.0.0.1 --port 8181 >/e2e/evidence/restart-web-2.log 2>&1 &
WEB1=$!

# Catch-up fires ~5s after boot; watch 40s for exactly one new request.
GOT=0
for _ in $(seq 1 40); do
  AFTER=$(curl -sf http://127.0.0.1:9201/__log | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).length))")
  GOT=$(( AFTER - BEFORE ))
  [ "$GOT" -ge 1 ] && break
  sleep 1
done
sleep 10
AFTER=$(curl -sf http://127.0.0.1:9201/__log | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).length))")
GOT=$(( AFTER - BEFORE ))
echo "catchup shots on mock-primary: $GOT (before=$BEFORE after=$AFTER)"
if [ "$GOT" -eq 1 ]; then
  echo 'RESTART TEST PASS: exactly one catch-up shot'
else
  echo "RESTART TEST FAIL: expected 1, got $GOT" >&2
  exit 1
fi
