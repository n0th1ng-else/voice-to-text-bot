FROM node:22.11-bookworm AS builder

ENV NODE_ENV production

ARG APP_DIR=/usr/src/app/

RUN mkdir -p "$APP_DIR"
WORKDIR $APP_DIR

RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml tsconfig.json $APP_DIR
RUN npm pkg delete scripts.prepare
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY ./assets $APP_DIR/assets
COPY ./certs $APP_DIR/certs
COPY ./file-temp $APP_DIR/file-temp
COPY ./model-cache $APP_DIR/model-cache
COPY ./src $APP_DIR/src
COPY ./copy-files.ts $APP_DIR

RUN pnpm run build

FROM node:22.11-bookworm

EXPOSE 8080

ENV NEW_RELIC_NO_CONFIG_FILE true

ENV NODE_ENV production

ARG APP_VERSION=local
ENV APP_VERSION ${APP_VERSION}

RUN echo ${APP_VERSION}

ARG APP_DIR=/usr/src/app/

RUN mkdir -p "$APP_DIR"
WORKDIR $APP_DIR

RUN apt-get update && apt-get install -y binutils
RUN apt-get update && apt-get install -y libgomp1
RUN apt-get update && apt-get install -y libstdc++6

RUN npm install -g pnpm@9 && touch "$APP_DIR/.env"
COPY --from=builder $APP_DIR/assets $APP_DIR/assets
COPY --from=builder $APP_DIR/file-temp $APP_DIR/file-temp
COPY --from=builder $APP_DIR/model-cache $APP_DIR/model-cache
COPY --from=builder $APP_DIR/package.json $APP_DIR
COPY --from=builder $APP_DIR/pnpm-lock.yaml $APP_DIR
RUN npm pkg delete scripts.prepare
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

COPY --from=builder $APP_DIR/dist $APP_DIR/dist

ENV LD_LIBRARY_PATH=/usr/src/app/dist/src/whisper/addons/x64:${LD_LIBRARY_PATH}

USER node

CMD ["pnpm", "run", "cluster:js"]
