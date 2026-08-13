# Multi-stage build: compile the React app, then serve the static output directly from Caddy.
# This image IS the Caddy container used in docker-compose.prod.yml — one container handles
# TLS, static file serving, and reverse-proxying /api/* to the Rails backend.

FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Relative path, not an absolute host — same-origin, so this works regardless of domain and
# needs no rebuild if the domain ever changes.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/build /srv
