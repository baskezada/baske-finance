#!/bin/sh
set -eu
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/deploy/_lib.sh"

ENV=""
WITH_VOLUMES="0"

while [ $# -gt 0 ]; do
  case "$1" in
    -e|--env) ENV="$2"; shift 2 ;;
    --volumes) WITH_VOLUMES="1"; shift ;;
    *) shift ;;
  esac
done

[ -n "$ENV" ] || die "Falta -e dev|prod"
require_env "$ENV"

load_config "$ROOT_DIR"
PROJECT="$(project_name_for_env "$PROJECT_NAME" "$ENV")"
FILES="$(compose_files "$ENV")"
ENVFILE="$(env_file "$ENV")"

echo "Reset: project=$PROJECT env=$ENV"
if [ "$ENV" = "prod" ]; then
  echo "PROD es destructivo. Escribe exactamente: RESET-PROD"
  read -r confirm
  [ "$confirm" = "RESET-PROD" ] || die "Abortado"
fi

if [ "$WITH_VOLUMES" = "1" ]; then
  # shellcheck disable=SC2086
  docker compose --env-file "$ROOT_DIR/$ENVFILE" -p "$PROJECT" $FILES down -v
else
  # shellcheck disable=SC2086
  docker compose --env-file "$ROOT_DIR/$ENVFILE" -p "$PROJECT" $FILES down
fi

echo "Reset OK."
