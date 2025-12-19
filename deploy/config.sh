#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
ROOT_DIR="$(pwd)"
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
PROJECT="$(project_name_for_env "$PROJECT_NAME" "$ENV")"
FILES="$(compose_files "$ENV")"
ENVFILE="$(env_file "$ENV")"

echo "=== config ==="
echo "project: $PROJECT"
echo "envfile: $ENVFILE"
echo "compose files: $FILES"
echo ""
echo "--- env vars (from $ENVFILE) ---"
sed -n '1,200p' "$ROOT_DIR/$ENVFILE"
echo ""
echo "--- docker compose config (rendered) ---"
# shellcheck disable=SC2086
docker compose --env-file "$ROOT_DIR/$ENVFILE" -p "$PROJECT" $FILES config
