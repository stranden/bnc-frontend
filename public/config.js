/**
 * Runtime configuration.
 *
 * In development this file is intentionally empty — values come from `.env`.
 * In the container, the entrypoint overwrites it with the BNC_* environment
 * variables, so one image can be deployed to any environment without a
 * rebuild. See docker/40-bnc-runtime-config.sh.
 */
window.__BNC_CONFIG__ = {}
