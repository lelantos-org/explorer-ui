# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS builder
WORKDIR /app

# Vite inlines VITE_* at build time, so every runtime setting must be a build
# arg. Only these two are read by the app (src/api/context.tsx);
# VITE_API_TARGET is dev-server-only and deliberately absent.
ARG VITE_API_BASE
ARG VITE_USE_MOCK
# `.git` is dockerignored, so the build cannot read the commit itself; CI
# passes it. Absent, the footer reads "dev".
ARG VITE_COMMIT

ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_COMMIT=$VITE_COMMIT

# No .npmrc and no BuildKit npm secret: unlike webapp-ui, nothing here comes
# from the @lelantos-org GitHub Packages registry.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
