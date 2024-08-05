FROM node:20.14-slim AS builder

ENV NODE_ENV production

ARG APP_DIR=/usr/src/app/

RUN mkdir -p "$APP_DIR"
WORKDIR $APP_DIR

RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml tsconfig.json $APP_DIR
RUN npm pkg delete scripts.prepare
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY ./assets $APP_DIR/assets
COPY ./video-temp $APP_DIR/video-temp
COPY ./src $APP_DIR/src

RUN pnpm run build

FROM node:20.14-slim

EXPOSE 8080

ENV NEW_RELIC_NO_CONFIG_FILE true

ENV NODE_ENV production

ARG APP_VERSION=local
ENV APP_VERSION ${APP_VERSION}

RUN echo ${APP_VERSION}

ARG APP_DIR=/usr/src/app/

RUN mkdir -p "$APP_DIR"
WORKDIR $APP_DIR

RUN npm install -g pnpm@9
RUN touch $APP_DIR/.env
COPY --from=builder $APP_DIR/assets $APP_DIR/assets
COPY --from=builder $APP_DIR/video-temp $APP_DIR/video-temp
COPY --from=builder $APP_DIR/package.json $APP_DIR
COPY --from=builder $APP_DIR/pnpm-lock.yaml $APP_DIR
RUN npm pkg delete scripts.prepare
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

COPY --from=builder $APP_DIR/dist $APP_DIR/dist

USER node

CMD ["pnpm", "run", "cluster:js"]
