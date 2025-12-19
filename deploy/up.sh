#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

usage() {
  echo "Usage:"
  echo "  $0 <name> -env <dev|prod> -s <db api web|all> [--no-build]"
  echo ""
  echo "Examples:"
  echo "  $0 template-dev  -env dev  -s all"
  echo "  $0 template-prod -env prod -s db api web"
  echo "  $0 template-dev  -env dev  -s api --no-build"
  exit 1
}

[ $# -ge 1 ] || usage

BASE_NAME="$1"
PROJECT="$BASE_NAME"


shift

ENV_KIND=""
NO_BUILD="0"
REQ_SERVICES=""

while [ $# -gt 0 ]; do
  case "$1" in
    -e|-env)
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
    --no-build)
      NO_BUILD="1"
      shift
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
[ -n "${REQ_SERVICES## }" ] || { echo "Missing -s/-service"; usage; }


case "$ENV_KIND" in
  dev)  PROJECT="${BASE_NAME}-dev" ;;
  prod) PROJECT="${BASE_NAME}-prod" ;;
esac


case "$ENV_KIND" in
  dev)
    ENV_FILE=".env.dev"
    FILES="-f docker-compose.yml -f docker-compose.dev.yml"
    PROFILE_DB="db"
    PROFILE_API="api-dev"
    PROFILE_WEB="web-dev"
    ;;
  prod)
    ENV_FILE=".env.prod"
    FILES="-f docker-compose.yml -f docker-compose.prod.yml"
    PROFILE_DB="db"
    PROFILE_API="api"
    PROFILE_WEB="web"
    ;;
  *)
    echo "Invalid -env value: $ENV_KIND (expected dev|prod)"
    exit 1
    ;;
esac

# Expand "all"
SERVICES_EXPANDED=""
for s in $REQ_SERVICES; do
  case "$s" in
    all)
      SERVICES_EXPANDED="$SERVICES_EXPANDED db api web"
      ;;
    db|api|web)
      SERVICES_EXPANDED="$SERVICES_EXPANDED $s"
      ;;
    *)
      echo "Unknown service: $s (expected db|api|web|all)"
      exit 1
      ;;
  esac
done

PROFILES=""
SERVICE_NAMES=""

for s in $SERVICES_EXPANDED; do
  case "$s" in
    db)
      PROFILES="$PROFILES --profile $PROFILE_DB"
      SERVICE_NAMES="$SERVICE_NAMES postgres"
      ;;
    api)
      PROFILES="$PROFILES --profile $PROFILE_API"
      SERVICE_NAMES="$SERVICE_NAMES api"
      ;;
    web)
      PROFILES="$PROFILES --profile $PROFILE_WEB"
      SERVICE_NAMES="$SERVICE_NAMES web"
      ;;
  esac
done

BUILD_FLAG="--build"
if [ "$NO_BUILD" = "1" ]; then
  BUILD_FLAG=""
fi

# shellcheck disable=SC2086
docker compose --env-file "$ENV_FILE" -p "$PROJECT" $FILES $PROFILES up -d $BUILD_FLAG $SERVICE_NAMES

echo "Up OK: project=$PROJECT env=$ENV_KIND services=$SERVICES_EXPANDED"
