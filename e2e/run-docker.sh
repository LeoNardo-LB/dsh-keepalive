#!/usr/bin/env bash
# Host entry: build the E2E image and run the suite in it.
# Usage: bash e2e/run-docker.sh            (build + run)
#        bash e2e/run-docker.sh --no-cache (force rebuild)
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE=dsh-keepalive-e2e
docker build "$@" -f e2e/Dockerfile -t "$IMAGE" .
mkdir -p e2e/evidence
docker run --rm \
  --name dsh-keepalive-e2e \
  -v "$(pwd)/e2e/evidence:/e2e/evidence" \
  "$IMAGE"
