FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache git

RUN npm install -g npm@12.2.0

RUN mkdir -p /tmp/npm-patch && \
    cd /tmp/npm-patch && \
    npm install --ignore-scripts --no-audit --no-fund \
      brace-expansion@5.0.12 \
      undici@6.29.1 \
      http-cache-semantics@4.3.0 && \
    cp -a node_modules/brace-expansion/. /usr/local/lib/node_modules/npm/node_modules/brace-expansion/ && \
    cp -a node_modules/undici/. /usr/local/lib/node_modules/npm/node_modules/undici/ && \
    cp -a node_modules/http-cache-semantics/. /usr/local/lib/node_modules/npm/node_modules/http-cache-semantics/ && \
    rm -rf /tmp/npm-patch

COPY --from=builder /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]