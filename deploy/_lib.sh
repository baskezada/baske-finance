die() { echo "Error: $*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

ask() {
  prompt="$1"; def="${2:-}"
  if [ -n "$def" ]; then printf "%s [%s]: " "$prompt" "$def" >&2; else printf "%s: " "$prompt" >&2; fi
  read -r ans || true
  [ -n "${ans:-}" ] && echo "$ans" || echo "$def"
}

ask_yesno() {
  prompt="$1"; def="${2:-y}"
  while :; do
    ans="$(ask "$prompt (y/n)" "$def")"
    case "$ans" in y|Y) echo "y"; return 0;; n|N) echo "n"; return 0;; *) echo "Please answer y or n.";; esac
  done
}

env_file() {
  case "$1" in
    dev) echo ".env.dev" ;;
    prod) echo ".env.prod" ;;
    *) die "env desconocido $1" ;;
  esac
}

compose_files() {
  case "$1" in
    dev) echo "-f docker-compose.yml -f docker-compose.dev.yml" ;;
    prod) echo "-f docker-compose.yml -f docker-compose.prod.yml" ;;
    *) die "env desconocido $1" ;;
  esac
}

load_config() {
  root="$1"
  [ -f "$root/project.config" ] || die "Falta project.config"
  # shellcheck source=/dev/null
  . "$root/project.config"
}

project_name_for_env() {
  base="$1"
  env="$2"
  echo "${base}-${env}"
}

require_env() {
  env="$1"
  case "$env" in dev|prod) :;; *) die "env inválido: $env (dev|prod)";; esac
}

get_port_from_envfile() {
  # $1 rootdir, $2 envfile, $3 key
  root="$1"; envfile="$2"; key="$3"
  val="$(grep -E "^${key}=" "$root/$envfile" | tail -n 1 | cut -d= -f2- || true)"
  echo "$val"
}
