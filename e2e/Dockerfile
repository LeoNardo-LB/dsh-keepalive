# E2E image: real dsh web profile + the plugin + two mock providers.
# Full (non-slim) base: dsh's node-pty dependency needs the node-gyp toolchain.
# PINNED (was floating node:26): the floating tag drifted 26.7 -> 26.10 and the
# newer runtime's timing deterministically trips the legacy hosts' boot race
# ("user patch-layer watching requires the Cordis HMR service" — ctx.get('hmr')
# still unset right after loader.create). Keep matrix rounds reproducible.
FROM node:26.7

# Same line as the production install + pnpm for profile plugin adds.
# DSH_VERSION pins the host under test: V1 baseline 0.1.1-rc.2, or the V2
# preview line (e.g. 0.1.2-alpha.5) for the dual-host compat matrix.
ARG DSH_VERSION=0.1.1-rc.2
# Transitive-dependency PINS (the matrix-era resolution of each host line):
# dsh itself is pinned, but its @deepseek-ai/* deps float on every rebuild —
# today's cordis/cordis-plugin-hmr under a legacy host deterministically
# trips the boot race ("user patch-layer watching requires the Cordis HMR
# service"). run-docker.sh passes the era-matching set per DSH_VERSION.
ARG CORDIS_PIN=4.0.2
ARG HMR_PIN=1.0.17
ARG LOADER_PIN=1.0.3
ARG COSMOKIT_PIN=1.8.3
ARG TIMER_PIN=1.1.4
RUN npm install -g --no-audit --no-fund pnpm@11.25.0 @deepseek-ai/dsh@${DSH_VERSION} \
  && cd /usr/local/lib/node_modules/@deepseek-ai/dsh \
  && CORDIS_PIN="${CORDIS_PIN}" HMR_PIN="${HMR_PIN}" LOADER_PIN="${LOADER_PIN}" COSMOKIT_PIN="${COSMOKIT_PIN}" TIMER_PIN="${TIMER_PIN}" node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json"));const pins={"@deepseek-ai/cordis":process.env.CORDIS_PIN,"@deepseek-ai/cordis-plugin-hmr":process.env.HMR_PIN,"@deepseek-ai/cordis-plugin-loader":process.env.LOADER_PIN,"@deepseek-ai/cosmokit":process.env.COSMOKIT_PIN,"@deepseek-ai/cordis-plugin-timer":process.env.TIMER_PIN};p.dependencies=Object.assign({},p.dependencies,pins);p.overrides=pins;fs.writeFileSync("package.json",JSON.stringify(p,null,2));' \
  && npm install --no-audit --no-fund

# Headless chromium + CJK fonts for the browser-half verification.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

# The plugin package: install dev deps and build both halves.
WORKDIR /plugin
COPY . .
RUN pnpm install && pnpm run build

# E2E assets + isolated harness home. The node_modules symlink lets the
# browser-check import puppeteer-core (an installed devDependency of /plugin).
COPY e2e/ /e2e/
RUN mkdir -p /e2e/dsh-home /e2e/evidence   && ln -s /plugin/node_modules /e2e/node_modules
ENV DSH_HOME=/e2e/dsh-home

WORKDIR /e2e
ENTRYPOINT ["bash", "/e2e/run-e2e.sh"]
