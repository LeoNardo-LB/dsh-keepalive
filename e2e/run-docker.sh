#!/usr/bin/env bash
# Host entry: build the E2E image and run the suite in it.
# Usage: bash e2e/run-docker.sh                           (build + run, V1 host)
#        bash e2e/run-docker.sh --no-cache                  (force rebuild)
#        DSH_VERSION=0.1.2-alpha.5 bash e2e/run-docker.sh  (V2 host matrix round)
set -euo pipefail
cd "$(dirname "$0")/.."

DSH_VERSION="${DSH_VERSION:-0.1.1-rc.2}"
IMAGE="dsh-keepalive-e2e:${DSH_VERSION}"
# Era-matching transitive pins (see Dockerfile): the legacy matrix lines
# resolve their September era; hosts from 0.1.7 pin the current set.
case "$DSH_VERSION" in
  0.1.7*)
    CORDIS_PIN=4.0.4 HMR_PIN=1.0.19 LOADER_PIN=1.0.5 COSMOKIT_PIN=1.8.5 TIMER_PIN=1.1.6 ;;
  *)
    CORDIS_PIN=4.0.2 HMR_PIN=1.0.17 LOADER_PIN=1.0.3 COSMOKIT_PIN=1.8.3 TIMER_PIN=1.1.4 ;;
esac
docker build "$@" \
  --build-arg DSH_VERSION="${DSH_VERSION}" \
  --build-arg CORDIS_PIN="${CORDIS_PIN}" \
  --build-arg HMR_PIN="${HMR_PIN}" \
  --build-arg LOADER_PIN="${LOADER_PIN}" \
  --build-arg COSMOKIT_PIN="${COSMOKIT_PIN}" \
  --build-arg TIMER_PIN="${TIMER_PIN}" \
  -f e2e/Dockerfile -t "$IMAGE" .
mkdir -p e2e/evidence
docker run --rm \
  --name dsh-keepalive-e2e \
  -v "$(pwd)/e2e/evidence:/e2e/evidence" \
  "$IMAGE"
