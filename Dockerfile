FROM node:20.11.0 AS builder

ENV NODE_ENV production

ARG APP_DIR=/usr/src/app/

RUN mkdir -p "$APP_DIR"
WORKDIR $APP_DIR

COPY package.json package-lock.json tsconfig.json $APP_DIR
RUN npm pkg delete scripts.prepare
RUN npm ci && npm cache clean --force

COPY ./assets $APP_DIR/assets
COPY ./certs $APP_DIR/certs
COPY ./video-temp $APP_DIR/video-temp
COPY ./init.cjs $APP_DIR/init.cjs
COPY ./src $APP_DIR/src

RUN npm run build

FROM node:20.11.0

EXPOSE 8080

ENV NEW_RELIC_NO_CONFIG_FILE true

ENV NODE_ENV production

ARG APP_VERSION=local
ENV APP_VERSION ${APP_VERSION}

RUN echo ${APP_VERSION}

ARG APP_DIR=/usr/src/app/

RUN mkdir -p "$APP_DIR"
WORKDIR $APP_DIR

COPY --from=builder $APP_DIR/assets $APP_DIR/assets
COPY --from=builder $APP_DIR/video-temp $APP_DIR/video-temp
COPY --from=builder $APP_DIR/init.cjs $APP_DIR/init.cjs
COPY --from=builder $APP_DIR/package.json $APP_DIR
COPY --from=builder $APP_DIR/package-lock.json $APP_DIR
RUN npm pkg delete scripts.prepare
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder $APP_DIR/dist $APP_DIR/dist
RUN dir -s
USER node

CMD ["npm", "run", "cluster:js"]
