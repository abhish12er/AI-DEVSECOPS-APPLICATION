
# Stage 1: Build React frontend
FROM node:24-alpine AS builder

WORKDIR /app

RUN apk upgrade --no-cache

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# Stage 2: Serve frontend using Nginx
FROM nginx:stable-alpine

RUN apk upgrade --no-cache

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
