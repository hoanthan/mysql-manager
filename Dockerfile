FROM node:21.7.3-alpine as builder

WORKDIR /builder

COPY package.json yarn.lock ./

RUN yarn config set network-timeout 300000
RUN apk add g++ make py3-pip
RUN yarn global add node-gyp
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build
RUN yarn install --production

FROM node:21.7.3-alpine as main

WORKDIR /app
COPY --from=builder [ "/builder/node_modules", "./node_modules" ]
COPY --from=builder ["/builder/package.json", "/builder/yarn.lock", "/builder/.env", "./"]
COPY --from=builder /builder/dist ./dist
RUN mkdir "./dumps"

CMD NODE_ENV=production node dist/index.js
