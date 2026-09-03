#!/usr/bin/env bash
# Host entry: build the E2E image and run the suite in it.
# Usage: bash e2e/run-docker.sh                           (build + run, V1 host)
#        bash e2e/run-docker.sh --no-cache                  (force rebuild)
#        DSH_VERSION=0.1.2-alpha.5 bash e2e/run-docker.sh  (V2 host matrix round)
set -euo pipefail
cd "$(dirname "$0")/.."

DSH_VERSION="${DSH_VERSION:-0.1.1-rc.2}"
IMAGE="dsh-keepalive-e2e:${DSH_VERSION}"
docker build "$@" --build-arg DSH_VERSION="${DSH_VERSION}" -f e2e/Dockerfile -t "$IMAGE" .
mkdir -p e2e/evidence
docker run --rm \
  --name dsh-keepalive-e2e \
  -v "$(pwd)/e2e/evidence:/e2e/evidence" \
  "$IMAGE"
