FROM node:18.16.1

EXPOSE 8080

ENV NODE_ENV production

ENV NEW_RELIC_NO_CONFIG_FILE true

ARG APP_DIR=/usr/src/app/

RUN mkdir -p $APP_DIR
WORKDIR $APP_DIR

COPY package.json package-lock.json $APP_DIR
RUN npm pkg delete scripts.prepare
RUN npm ci --omit=dev && npm cache clean --force

ARG APP_VERSION=local
ENV APP_VERSION ${APP_VERSION}

RUN echo ${APP_VERSION}

COPY ./certs $APP_DIR/certs
COPY ./src $APP_DIR/src
COPY ./video-temp $APP_DIR/video-temp
COPY ./init.cjs $APP_DIR
COPY ./tsconfig.json $APP_DIR

RUN find $APP_DIR/src -type f -name '*.spec.ts' -delete

RUN npm run build

RUN find $APP_DIR/src -type f | xargs -L1 rm -f

USER node

CMD ["npm", "run", "cluster:js"]
