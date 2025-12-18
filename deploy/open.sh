#!/bin/sh
set -eu
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/deploy/_lib.sh"

ENV=""
while [ $# -gt 0 ]; do
  case "$1" in
    -e|--env) ENV="$2"; shift 2 ;;
    *) shift ;;
  esac
done
[ -n "$ENV" ] || die "Falta -e dev|prod"
require_env "$ENV"

load_config "$ROOT_DIR"
ENVFILE="$(env_file "$ENV")"

API_PORT="$(get_port_from_envfile "$ROOT_DIR" "$ENVFILE" "API_PORT")"
WEB_PORT="$(get_port_from_envfile "$ROOT_DIR" "$ENVFILE" "WEB_PORT")"
DB_PORT="$(get_port_from_envfile "$ROOT_DIR" "$ENVFILE" "POSTGRES_PORT")"


# Detect IP
NAS_IP="localhost"
if have hostname && [ -n "$(hostname -I 2>/dev/null)" ]; then
  # Take the first IP
  NAS_IP="$(hostname -I | cut -d' ' -f1)"
elif have ip; then
  NAS_IP="$(ip route get 1 2>/dev/null | awk '{print $7;exit}')"
fi
[ -z "$NAS_IP" ] && NAS_IP="localhost"

echo "=== $PROJECT_NAME ($ENV) endpoints ==="
[ -n "$API_PORT" ] && echo "API:      http://${NAS_IP}:${API_PORT}"
[ -n "$WEB_PORT" ] && echo "WEB:      http://${NAS_IP}:${WEB_PORT}"
[ -n "$DB_PORT" ] && echo "DB host:  ${NAS_IP}:${DB_PORT}"
echo ""
echo "Internal (Docker):"
echo "DB:  postgres:5432"
echo "API: api:3000"
echo "WEB: web:80"
