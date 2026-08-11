# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first so this layer is cached unless the lockfile moves.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Runtime configuration is injected by the entrypoint at container start, so
# the build is environment-neutral. These only set the compiled-in fallbacks
# used if a BNC_* variable is not provided at runtime.
ARG VITE_API_BASE_URL=/api
ARG VITE_USE_MOCK=false
ARG VITE_MOCK_UNIMPLEMENTED=true
ARG VITE_AUTH_PROVIDER=dev
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_MOCK_UNIMPLEMENTED=$VITE_MOCK_UNIMPLEMENTED \
    VITE_AUTH_PROVIDER=$VITE_AUTH_PROVIDER

# Runs vue-tsc then vite build, so a type error fails the image build.
RUN npm run build

# ---------------------------------------------------------------------------
# Runtime stage
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Where nginx forwards /api. Point this at the BNC backend service.
ENV BNC_BACKEND_URL=http://bnc-backend:8000 \
    BNC_API_BASE_URL=/api \
    BNC_USE_MOCK=false \
    BNC_MOCK_UNIMPLEMENTED=true \
    BNC_MOCK_LATENCY=0 \
    BNC_MOCK_SINGLE_SITE=false \
    BNC_AUTH_PROVIDER=dev

# Restrict envsubst to BNC_* so nginx's own $host/$uri variables survive.
ENV NGINX_ENVSUBST_FILTER="^BNC_"

# The base image renders /etc/nginx/templates/*.template through envsubst and
# runs /docker-entrypoint.d/*.sh before starting nginx.
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/40-bnc-runtime-config.sh /docker-entrypoint.d/40-bnc-runtime-config.sh

# Windows checkouts do not preserve the executable bit, so set it explicitly.
RUN chmod +x /docker-entrypoint.d/40-bnc-runtime-config.sh

COPY --from=build /app/dist /usr/share/nginx/html

# Unprivileged port, so the image also runs as a non-root user if required.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/healthz || exit 1
