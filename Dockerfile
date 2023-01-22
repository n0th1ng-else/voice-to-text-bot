FROM node:16.16.0

EXPOSE 8080

ARG INFRA_TOKEN
ARG INFRA_REGION=EU
ARG APP_VERSION=local
ENV APP_VERSION ${APP_VERSION}

RUN echo ${APP_VERSION}
RUN echo ${INFRA_TOKEN}

# Launch monitoring agent
RUN echo "deb http://pub-repo.sematext.com/ubuntu sematext main" | tee /etc/apt/sources.list.d/sematext.list > /dev/null
RUN wget -O - https://pub-repo.sematext.com/ubuntu/sematext.gpg.key | apt-key add -
RUN apt-get update

RUN apt-get install -y openjdk-11-jdk ca-certificates-java
RUN apt-get clean
RUN update-ca-certificates -f

ENV JAVA_HOME /usr/lib/jvm/java-11-openjdk-amd64/
RUN export JAVA_HOME

RUN apt-get -y install sematext-agent

RUN bash /opt/spm/bin/setup-infra --infra-token ${INFRA_TOKEN} --region ${INFRA_REGION}

# Build and run the applicaiton
ENV NODE_ENV production

ARG APP_DIR=/usr/src/app/

RUN mkdir -p $APP_DIR
WORKDIR $APP_DIR

COPY package.json package-lock.json $APP_DIR
RUN npm pkg set prepare=""
RUN npm ci --omit=dev && npm cache clean --force

COPY . $APP_DIR

RUN npm run build

RUN find $APP_DIR/src -type f | xargs -L1 rm -f

CMD ["npm", "run", "cluster:js"]
