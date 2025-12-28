# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.11.1
ARG PNPM_VERSION=9

############################################
# base — shared bootstrap (corepack + pnpm)
############################################
FROM node:${NODE_VERSION}-slim AS base
ARG PNPM_VERSION
ENV CI=true \
    HUSKY=0 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@"${PNPM_VERSION}" --activate
WORKDIR /app

############################################
# deps — install all deps (prod + dev)
# cache key: pnpm-lock.yaml, then package.json
############################################
FROM base AS deps
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates g++ make python3

COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm fetch

COPY package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline

############################################
# build — compile TS + copy runtime assets
############################################
FROM deps AS build
COPY tsconfig.json ./
COPY certs ./certs
COPY assets ./assets
COPY src ./src
RUN pnpm run build

############################################
# prod-deps — strip dev deps via prune
# (reuses build tools + store from deps stage)
############################################
FROM deps AS prod-deps

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm prune --prod --ignore-scripts

############################################
# runtime — minimal final image
############################################
FROM node:${NODE_VERSION}-slim AS runtime
ARG APP_VERSION=local
ENV NODE_ENV=production \
    NEW_RELIC_NO_CONFIG_FILE=true \
    APP_VERSION=${APP_VERSION}
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build     --chown=node:node /app/dist         ./dist
COPY --from=build     --chown=node:node /app/assets       ./assets
COPY --from=build     --chown=node:node /app/package.json ./
COPY                  --chown=node:node ./file-temp       ./file-temp
COPY                  --chown=node:node ./model-cache     ./model-cache

RUN install -o node -g node -m 644 /dev/null /app/.env

EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
CMD ["npm", "run", "cluster:js"]
