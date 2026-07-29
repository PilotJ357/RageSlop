# Base images are pinned by digest. `node:22-alpine` and `nginx:alpine` are mutable
# tags, so an unpinned build inherits whatever they happen to point at that day.
FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS build
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
