# Base images are pinned by digest. `node:22-alpine` and `nginx:alpine` are mutable
# tags, so an unpinned build inherits whatever they happen to point at that day.
FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.30.4-alpine@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
