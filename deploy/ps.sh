#!/bin/sh
set -eu

usage() {
  echo "Usage:"
  echo "  $0 <name> -env <dev|prod>"
  echo ""
  echo "Example:"
  echo "  $0 template-dev -env dev"
  exit 1
}

[ $# -ge 1 ] || usage

BASE_NAME="$1"
PROJECT="$BASE_NAME"


shift

ENV_KIND=""

while [ $# -gt 0 ]; do
  case "$1" in
    -env)
      [ $# -ge 2 ] || usage
      ENV_KIND="$2"
      shift 2
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

# shellcheck disable=SC2086
docker compose --env-file "$ENV_FILE" -p "$PROJECT" $FILES ps
