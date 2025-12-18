#!/bin/sh
set -eu

usage() {
  echo "Usage:"
  echo "  $0 <name> -env <dev|prod> [-s <db api web|all>]"
  echo ""
  echo "Examples:"
  echo "  $0 template-dev  -env dev"
  echo "  $0 template-prod -env prod -s web"
  echo "  $0 template-dev  -env dev -s api db"
  exit 1
}

[ $# -ge 1 ] || usage

BASE_NAME="$1"
PROJECT="$BASE_NAME"


shift

ENV_KIND=""
REQ_SERVICES=""

while [ $# -gt 0 ]; do
  case "$1" in
    -env)
      [ $# -ge 2 ] || usage
      ENV_KIND="$2"
      shift 2
      ;;
    -service|-services|-s)
      shift
      while [ $# -gt 0 ] && [ "${1#-}" = "$1" ]; do
        REQ_SERVICES="$REQ_SERVICES $1"
        shift
      done
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown arg: $1"
      usage
      ;;
  esac
done

[ -n "$ENV_KIND" ] || { echo "Missing -env"; usage; }

case "$ENV_KIND" in
  dev)  PROJECT="${BASE_NAME}-dev" ;;
  prod) PROJECT="${BASE_NAME}-prod" ;;
esac


case "$ENV_KIND" in
  dev)
    ENV_FILE=".env.dev"
    FILES="-f docker-compose.yml -f docker-compose.dev.yml"
    ;;
  prod)
    ENV_FILE=".env.prod"
    FILES="-f docker-compose.yml -f docker-compose.prod.yml"
    ;;
  *)
    echo "Invalid -env value: $ENV_KIND (expected dev|prod)"
    exit 1
    ;;
esac

# Default: logs de todo
SERVICE_NAMES=""
if [ -n "${REQ_SERVICES## }" ]; then
  SERVICES_EXPANDED=""
  for s in $REQ_SERVICES; do
    case "$s" in
      all) SERVICES_EXPANDED="$SERVICES_EXPANDED db api web" ;;
      db|api|web) SERVICES_EXPANDED="$SERVICES_EXPANDED $s" ;;
      *) echo "Unknown service: $s (expected db|api|web|all)"; exit 1 ;;
    esac
  done

  for s in $SERVICES_EXPANDED; do
    case "$s" in
      db)  SERVICE_NAMES="$SERVICE_NAMES postgres" ;;
      api) SERVICE_NAMES="$SERVICE_NAMES api" ;;
      web) SERVICE_NAMES="$SERVICE_NAMES web" ;;
    esac
  done
fi

# shellcheck disable=SC2086
docker compose --env-file "$ENV_FILE" -p "$PROJECT" $FILES logs -f $SERVICE_NAMES
