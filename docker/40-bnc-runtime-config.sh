#!/bin/sh
# Write the runtime configuration consumed by the frontend.
#
# Vite inlines import.meta.env at build time, so without this the image would
# have to be rebuilt for every environment. Instead the app reads
# window.__BNC_CONFIG__ from /config.js, which is regenerated on every start
# from the BNC_* environment variables.
#
# Run automatically by the nginx base image's entrypoint (/docker-entrypoint.d).

set -eu

CONFIG_FILE="/usr/share/nginx/html/config.js"

# Escape backslashes and double quotes so a value can never break out of the
# JSON string and inject script into the page.
escape() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat >"$CONFIG_FILE" <<EOF
// Generated at container start. Do not edit; changes are overwritten.
window.__BNC_CONFIG__ = {
  apiBaseUrl: "$(escape "${BNC_API_BASE_URL:-/api}")",
  useMock: "$(escape "${BNC_USE_MOCK:-false}")",
  mockUnimplemented: "$(escape "${BNC_MOCK_UNIMPLEMENTED:-true}")",
  mockLatency: "$(escape "${BNC_MOCK_LATENCY:-0}")",
  mockSingleSite: "$(escape "${BNC_MOCK_SINGLE_SITE:-false}")",
  authProvider: "$(escape "${BNC_AUTH_PROVIDER:-dev}")"
};
EOF

echo "bnc-frontend: runtime config written to ${CONFIG_FILE}"
echo "bnc-frontend: proxying /api to ${BNC_BACKEND_URL:-http://bnc-backend:8000}"
