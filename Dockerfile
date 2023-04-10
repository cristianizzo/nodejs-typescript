FROM node:18.15.0 as builder

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json yarn.lock tsconfig.json ./

RUN npm install -g npm@9.6.4
RUN yarn install --frozen-lockfile

COPY . .
COPY config ./config

RUN yarn build

FROM node:18.15.0 as release
# RUN echo "deb http://deb.debian.org/debian jessie main\ndeb http://security.debian.org jessie/updates main" > /etc/apt/sources.list
RUN apt-get update && apt-get install netcat -y

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json yarn.lock tsconfig.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/config/scripts ./config/scripts

RUN npm install -g npm@9.6.4
RUN yarn install --production --frozen-lockfile

