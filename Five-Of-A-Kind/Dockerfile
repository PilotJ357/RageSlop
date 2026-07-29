# Base images are pinned by digest. `node:22-alpine` and `nginx:alpine` are mutable
# tags, so an unpinned build inherits whatever they happen to point at that day.
FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# nginx-unprivileged runs its master process as a non-root user; the stock nginx image
# runs it as root. Consequence: it listens on 8080 instead of 80.
FROM nginxinc/nginx-unprivileged:1.30.4-alpine@sha256:44e36330f74d4f3a1d4e222acca9e23b401fb87811a7597024502bb759c4dd49
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
