#!/usr/bin/env bash
# E2E harness init inside the container: real web profile + our plugin linked
# in + overlay with a fast-cadence keepalive config pointing at mock providers.
set -euo pipefail
export DSH_HOME=/e2e/dsh-home
PROFILE_DIR="$DSH_HOME/profiles/web"
mkdir -p "$PROFILE_DIR" /e2e/workspace

cat > "$PROFILE_DIR/package.json" << MANIFEST_EOF
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {},
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"] } }
}
MANIFEST_EOF
echo '[]' > "$PROFILE_DIR/cordis.yml"
cat > "$PROFILE_DIR/pnpm-workspace.yaml" << WS_EOF
packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false
WS_EOF

dsh plugin --profile web add /plugin

cat > /e2e/e2e-overlay.yml << OVERLAY_EOF
# E2E overlay: mock providers + keepalive cadence (schema clamps interval to
# >=1min, so the driver drives speed via catch-up + fire-now + history reads).
- insert:
    - id: dsh-keepalive
      name: 'dsh-keepalive'
      config:
        enabled: true
        intervalMinutes: 1
        jitterPercent: 20
        providers:
          mock-primary:
            enabled: true
          mock-backup:
            enabled: true
- id: llm-pi-ai
  config:
    providers:
      mock-primary:
        apiKeyEnv: MOCK_PRIMARY_KEY
        api: openai-completions
        baseURL: http://127.0.0.1:9201/v1
        models:
          - id: mock-keepalive-model
            name: Mock Primary
            contextWindow: 1000000
            maxTokens: 8192
      mock-backup:
        apiKeyEnv: MOCK_BACKUP_KEY
        api: openai-completions
        baseURL: http://127.0.0.1:9202/v1
        models:
          - id: mock-keepalive-model
            name: Mock Backup
            contextWindow: 1000000
            maxTokens: 8192
OVERLAY_EOF

dsh web --patch /e2e/e2e-overlay.yml --dump-config >/e2e/evidence/dump-config.yml 2>&1
grep -q 'dsh-keepalive' /e2e/evidence/dump-config.yml || { echo 'SETUP FAIL: plugin missing from dump-config' >&2; exit 1; }
echo 'profile ready'
