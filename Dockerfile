FROM node:12

EXPOSE 8080

ENV NODE_ENV production

ARG APP_DIR=/usr/src/app/

RUN mkdir -p $APP_DIR
WORKDIR $APP_DIR

COPY package.json package-lock.json $APP_DIR
RUN npm ci && npm cache clean --force

COPY . $APP_DIR

ARG APP_VERSION=local
ENV APP_VERSION ${APP_VERSION}

RUN echo ${APP_VERSION}

RUN npm run build

RUN find $APP_DIR/src -type f | xargs -L1 rm -f

CMD ["npm", "run", "cluster:js"]
