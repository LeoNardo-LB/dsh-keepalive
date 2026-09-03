# E2E image: real dsh web profile + the plugin + two mock providers.
# Full (non-slim) base: dsh's node-pty dependency needs the node-gyp toolchain.
FROM node:26

# Same line as the production install + pnpm for profile plugin adds.
# DSH_VERSION pins the host under test: V1 baseline 0.1.1-rc.2, or the V2
# preview line (e.g. 0.1.2-alpha.5) for the dual-host compat matrix.
ARG DSH_VERSION=0.1.1-rc.2
RUN npm install -g --no-audit --no-fund pnpm@11 @deepseek-ai/dsh@${DSH_VERSION}

# Headless chromium + CJK fonts for the browser-half verification.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

# The plugin package: install dev deps and build both halves.
WORKDIR /plugin
COPY . .
RUN pnpm install && pnpm run build

# E2E assets + isolated harness home.
COPY e2e/ /e2e/
RUN mkdir -p /e2e/dsh-home /e2e/evidence
ENV DSH_HOME=/e2e/dsh-home

WORKDIR /e2e
ENTRYPOINT ["bash", "/e2e/run-e2e.sh"]
