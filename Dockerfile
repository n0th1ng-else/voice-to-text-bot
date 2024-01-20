FROM node:20.11.0 AS builder

ENV NODE_ENV production

ARG APP_DIR=/usr/src/app/

RUN mkdir -p "$APP_DIR"
WORKDIR $APP_DIR

COPY package.json package-lock.json tsconfig.json $APP_DIR
RUN npm ci --ignore-scripts && npm cache clean --force

COPY ./src $APP_DIR/src
COPY ./certs $APP_DIR/certs
COPY ./init.cjs $APP_DIR/init.cjs
RUN find "$APP_DIR/src" -type d -name __mocks__ -prune -exec rm -rf {} \;
RUN find "$APP_DIR/src" -type f -name '*.spec.ts' -prune -exec rm -rf {} \;

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

COPY --from=builder $APP_DIR/package.json $APP_DIR
COPY --from=builder $APP_DIR/package-lock.json $APP_DIR
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder $APP_DIR/dist $APP_DIR/dist
COPY --from=builder $APP_DIR/init.cjs $APP_DIR/init.cjs

USER node

CMD ["npm", "run", "cluster:js"]
