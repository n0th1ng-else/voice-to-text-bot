FROM node:16.16.0

EXPOSE 8080

ENV NODE_ENV production

ARG APP_DIR=/usr/src/app/

RUN mkdir -p $APP_DIR
WORKDIR $APP_DIR

COPY package.json package-lock.json $APP_DIR
RUN npm pkg delete scripts.prepare
RUN npm ci --omit=dev && npm cache clean --force

ARG APP_VERSION=local
ENV APP_VERSION ${APP_VERSION}

RUN echo ${APP_VERSION}

COPY . $APP_DIR

RUN npm run build

RUN find $APP_DIR/src -type f | xargs -L1 rm -f

CMD ["npm", "run", "cluster:js"]
