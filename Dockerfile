FROM node:11

EXPOSE 8080

ENV NODE_ENV production

ARG APP_DIR=/usr/src/app/

ARG APP_VERSION=local
ENV APP_VERSION ${APP_VERSION}

RUN mkdir -p $APP_DIR
WORKDIR $APP_DIR

COPY package.json package-lock.json $APP_DIR
RUN npm ci && npm cache clean --force

COPY . $APP_DIR

CMD ["npm", "run", "dev"]
