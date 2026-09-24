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

# Keepalive cadence placement is host-generation dependent:
# - hosts from 0.1.7: PROFILE USER LAYER. The settings service refuses
#   persistent writes for entries overridden by a command-line overlay
#   ("Configuration ... is overridden"), which would 500 every opt-in /
#   model-save / config-save flow the browser check drives.
# - legacy hosts (0.1.1-rc.2 / 0.1.2-alpha.5): the --patch OVERLAY. A user
#   patch-layer file there requires the Cordis HMR service this minimal
#   profile does not carry ("user patch-layer watching requires the Cordis
#   HMR service"), so keep the legacy shape: overlay row, no user layer.
KEEPALIVE_ROW='- id: dsh-keepalive
  config:
    enabled: true
    intervalMinutes: 1
    jitterPercent: 20
    providers:
      mock-primary:
        enabled: true
      mock-backup:
        enabled: true'
HOST_VER="$(dsh --version 2>/dev/null | tr -d '[:space:]')"
case "$HOST_VER" in
  0.1.[123456]*)
    OVERLAY_KEEPALIVE="$KEEPALIVE_ROW"
    ;;
  *)
    printf '%s\n' "$KEEPALIVE_ROW" > "$PROFILE_DIR/cordis.patch.yml"
    OVERLAY_KEEPALIVE=''
    ;;
esac

cat > /e2e/e2e-overlay.yml << OVERLAY_EOF
# E2E overlay: mock providers (+ keepalive cadence on legacy hosts). The
# plugin row itself is inserted by the bundle layer (dsh plugin add
# reconciled the package patch); on 0.1.7+ its cadence config rides the
# profile user layer instead (see above).
$OVERLAY_KEEPALIVE
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
      mock-spare:
        apiKeyEnv: MOCK_SPARE_KEY
        api: openai-completions
        baseURL: http://127.0.0.1:9203/v1
        models:
          - id: mock-keepalive-model
            name: Mock Spare
            contextWindow: 1000000
            maxTokens: 8192
OVERLAY_EOF

dsh web --patch /e2e/e2e-overlay.yml --dump-config >/e2e/evidence/dump-config.yml 2>&1
grep -q 'dsh-keepalive' /e2e/evidence/dump-config.yml || { echo 'SETUP FAIL: plugin missing from dump-config' >&2; exit 1; }
echo 'profile ready'
