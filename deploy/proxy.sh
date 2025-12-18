#!/bin/sh
set -eu
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/deploy/_lib.sh"

usage() {
  echo "Usage:"
  echo "  $0 <name> -env <dev|prod> -s <db|api|web> [--host <domain>]"
  echo ""
  echo "Creates a Reverse Proxy entry in Synology Nginx."
  echo "Requires root privileges (sudo)."
  echo ""
  echo "Examples:"
  echo "  sudo $0 myapp -env dev -s web"
  echo "  sudo $0 myapp -env prod -s api --host api.example.com"
  exit 1
}

[ $# -ge 1 ] || usage

BASE_NAME="$1"
# PROJECT="$BASE_NAME" # Not strictly needed if we use env vars
shift

ENV_KIND=""
SERVICE=""
HOST_DOMAIN=""

while [ $# -gt 0 ]; do
  case "$1" in
    -env|-e)
      [ $# -ge 2 ] || usage
      ENV_KIND="$2"
      shift 2
      ;;
    -service|-services|-s)
      [ $# -ge 2 ] || usage
      SERVICE="$2"
      shift 2
      ;;
    --host)
      [ $# -ge 2 ] || usage
      HOST_DOMAIN="$2"
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
[ -n "$SERVICE" ] || { echo "Missing -s"; usage; }

# Validate service (single only)
case "$SERVICE" in
  db|api|web) : ;;
  *) echo "Service must be one of: db, api, web"; exit 1 ;;
esac

require_env "$ENV_KIND"
load_config "$ROOT_DIR"
ENVFILE="$(env_file "$ENV_KIND")"

# Check for python (used for JSON and Vite updates)
PYTHON=""
if have python3; then PYTHON="python3"; elif have python; then PYTHON="python"; fi

# 1. Get Port
PORT_VAR=""
case "$SERVICE" in
  api) PORT_VAR="API_PORT" ;;
  web) 
    if [ "$ENV_KIND" = "dev" ]; then PORT_VAR="WEB_DEV_PORT"; else PORT_VAR="WEB_PORT"; fi
    # Fallback if WEB_DEV_PORT is not set but WEB_PORT is (depends on .env structure)
    VAL="$(get_port_from_envfile "$ROOT_DIR" "$ENVFILE" "$PORT_VAR")"
    if [ -z "$VAL" ] && [ "$ENV_KIND" = "dev" ]; then PORT_VAR="WEB_PORT"; fi
    ;;
  db) PORT_VAR="POSTGRES_PORT" ;;
esac

TARGET_PORT="$(get_port_from_envfile "$ROOT_DIR" "$ENVFILE" "$PORT_VAR")"
[ -n "$TARGET_PORT" ] || die "No se encontró puerto para $SERVICE en $ENVFILE ($PORT_VAR)"

echo "--> Target: $SERVICE on port $TARGET_PORT ($ENV_KIND)"

# 2. Host/Domain
if [ -z "$HOST_DOMAIN" ]; then
  HOST_DOMAIN="$(ask "Dominio para el Reverse Proxy (ej: app.example.com)" "")"
fi
[ -n "$HOST_DOMAIN" ] || die "Se requiere un dominio."

# 3. Check Duplicate
NGINX_CONF="/etc/nginx/sites-enabled/server.ReverseProxy.conf"
if [ -f "$NGINX_CONF" ]; then
  if grep -q "server_name $HOST_DOMAIN ;" "$NGINX_CONF"; then
    die "El dominio $HOST_DOMAIN ya existe en $NGINX_CONF"
  fi
else
  echo "Advertencia: No existe $NGINX_CONF. Se creará (o el script fallará si Nginx no es standard Synology)."
fi

# 4. Check Root
if [ "$(id -u)" -ne 0 ]; then
  die "Este script debe ejecutarse como root (sudo)."
fi

# 5. UUIDs
if have uuidgen; then
  UUID="$(uuidgen)"
  CERT_ID="$(uuidgen)"
  KEY_ID="$(uuidgen)"
else
  # Fallback
  UUID="$(cat /proc/sys/kernel/random/uuid)"
  CERT_ID="$(cat /proc/sys/kernel/random/uuid)"
  KEY_ID="$(cat /proc/sys/kernel/random/uuid)"
fi

echo "--> UUID Generated: $UUID"

# 6. Certificates
CERT_DIR="$ROOT_DIR/deploy/certs"
CERT_SOURCE=""
KEY_SOURCE=""

# Check candidates
# 1. Custom generic names (User preference)
if [ -f "$CERT_DIR/ssl_certificate.pem" ] && [ -f "$CERT_DIR/ssl_certificate_key.pem" ]; then
  CERT_SOURCE="$CERT_DIR/ssl_certificate.pem"
  KEY_SOURCE="$CERT_DIR/ssl_certificate_key.pem"
# 2. Domain specific names
elif [ -f "$CERT_DIR/$HOST_DOMAIN.pem" ] && [ -f "$CERT_DIR/$HOST_DOMAIN.key" ]; then
  CERT_SOURCE="$CERT_DIR/$HOST_DOMAIN.pem"
  KEY_SOURCE="$CERT_DIR/$HOST_DOMAIN.key"
fi

if [ -z "$CERT_SOURCE" ] || [ -z "$KEY_SOURCE" ]; then
  echo "No encontré certificados automáticamente en $CERT_DIR"
  echo "Busqué: ssl_certificate.pem/.key O $HOST_DOMAIN.pem/.key"
  
  CERT_SOURCE="$(ask "Ruta al certificado (.pem/crt)" "")"
  KEY_SOURCE="$(ask "Ruta a la llave privada (.key)" "")"
fi

[ -f "$CERT_SOURCE" ] || die "No existe certificado: $CERT_SOURCE"
[ -f "$KEY_SOURCE" ] || die "No existe llave: $KEY_SOURCE"

# 7. Create Synology Cert Dir
SYNO_CERT_DIR="/usr/syno/etc/www/certificate/ReverseProxy_$UUID"
mkdir -p "$SYNO_CERT_DIR"
cp "$CERT_SOURCE" "$SYNO_CERT_DIR/$CERT_ID.pem"
cp "$KEY_SOURCE" "$SYNO_CERT_DIR/$KEY_ID.pem"

cat > "$SYNO_CERT_DIR/cert.conf" <<EOF
ssl_certificate          $SYNO_CERT_DIR/$CERT_ID.pem;
ssl_certificate_key      $SYNO_CERT_DIR/$KEY_ID.pem;
EOF

chmod 700 "$SYNO_CERT_DIR"
chmod 400 "$SYNO_CERT_DIR/"*

echo "--> Certificados copiados a $SYNO_CERT_DIR"

# 8. Update Nginx Config
# Create empty profile config to satisfy include (optional but good practice based on some guides, strictly manual study said include tls-profile)
# The user regex showed: include /usr/syno/etc/security-profile/tls-profile/config/ReverseProxy_{{UUID}}.conf*;
# We should probably creating that or ensuring it doesn't error. 
# If it's a wildcard include *, it might be fine if missing. But let's check user request. 
# User said: include .../ReverseProxy_{{UUID}}.conf*; 
# We'll skip creating the security profile file for now as it wasn't explicitly detailed *how* to create it, and the * allows it to be missing.

BLOCK="
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name $HOST_DOMAIN ;

    if ( \$host !~ \"(^$HOST_DOMAIN$)\" ) { return 404; }

    include /usr/syno/etc/www/certificate/ReverseProxy_$UUID/cert.conf*;

    include /usr/syno/etc/security-profile/tls-profile/config/ReverseProxy_$UUID.conf*;

    proxy_ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;

    location / {

        proxy_connect_timeout 60;

        proxy_read_timeout 60;

        proxy_send_timeout 60;

        proxy_intercept_errors off;

        proxy_http_version 1.1;

        proxy_set_header        Host            \$http_host;

        proxy_set_header        X-Real-IP            \$remote_addr;

        proxy_set_header        X-Forwarded-For            \$proxy_add_x_forwarded_for;

        proxy_set_header        X-Forwarded-Proto            \$scheme;

        proxy_pass http://localhost:$TARGET_PORT; 

    }

    error_page 403 404 500 502 503 504 /dsm_error_page;

    location /dsm_error_page {
        internal;
        root /usr/syno/share/nginx;
        rewrite (.*) /error.html break;
        allow all;
    }

}
"

echo "$BLOCK" >> "$NGINX_CONF"
echo "--> Agregado server block a $NGINX_CONF"

# 8.5 TLS Profiles
echo "--> Creating TLS Profiles..."

# A) config
mkdir -p "/usr/syno/etc/security-profile/tls-profile/config"
cat > "/usr/syno/etc/security-profile/tls-profile/config/ReverseProxy_$UUID.conf" <<EOF
ssl_protocols               TLSv1.2 TLSv1.3;
ssl_ciphers                 ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_dhparam                 /usr/syno/etc/ssl/dh2048.pem;
EOF

# B) mustache
mkdir -p "/usr/syno/etc/security-profile/tls-profile/mustache"
cat > "/usr/syno/etc/security-profile/tls-profile/mustache/ReverseProxy_$UUID.mustache" <<EOF
{{#mozilla_modern}}
ssl_protocols               TLSv1.3;
{{/mozilla_modern}}

{{#mozilla_intermediate}}
ssl_protocols               TLSv1.2 TLSv1.3;
ssl_ciphers                 ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_dhparam                 /usr/syno/etc/ssl/dh2048.pem;
{{/mozilla_intermediate}}

{{#mozilla_old}}
ssl_protocols               TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
ssl_ciphers                 ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA:ECDHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:DES-CBC3-SHA;
ssl_dhparam                 /usr/syno/etc/ssl/dh1024.pem;
{{/mozilla_old}}
EOF

# 8.4 Update Vite Config if service is web (and python exists)
if [ "$SERVICE" = "web" ] && [ -n "$PYTHON" ]; then
  VITE_CONFIG="$ROOT_DIR/web/vite.config.ts"
  if [ -f "$VITE_CONFIG" ]; then
    echo "--> Updating vite.config.ts allowedHosts..."
    cat > "$ROOT_DIR/deploy/update_vite_host.py" <<'EOF'
import sys
import re

file_path = sys.argv[1]
host = sys.argv[2]

try:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check if host already allowed
    if f"'{host}'" in content or f'"{host}"' in content:
        print("Host already in allowedHosts")
        sys.exit(0)

    # Regex to find allowedHosts: [ ... ]
    # This is simple/fragile but likely enough for standard vite config
    # We look for "allowedHosts: [" and insert our host
    
    pattern = r"(allowedHosts\s*:\s*\[)"
    if re.search(pattern, content):
        # Insert
        new_content = re.sub(pattern, f"\\1 '{host}', ", content)
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"Added {host} to allowedHosts")
    else:
        # Check if server block exists
        server_pattern = r"(server\s*:\s*\{)"
        if re.search(server_pattern, content):
             new_content = re.sub(server_pattern, f"\\1\\n    allowedHosts: ['{host}'],", content)
             with open(file_path, 'w') as f:
                f.write(new_content)
             print(f"Added allowedHosts to server block")
        else:
             print("Could not find server block or allowedHosts in vite.config.ts")

except Exception as e:
    print(f"Error update vite config: {e}")
EOF
    "$PYTHON" "$ROOT_DIR/deploy/update_vite_host.py" "$VITE_CONFIG" "$HOST_DOMAIN"
    rm "$ROOT_DIR/deploy/update_vite_host.py"
  fi
fi

# C) services
mkdir -p "/usr/syno/etc/security-profile/tls-profile/services"
cat > "/usr/syno/etc/security-profile/tls-profile/services/ReverseProxy_$UUID.conf" <<EOF
{"display-name":"$HOST_DOMAIN","mustache-path":"/usr/syno/share/nginx/TLSProfile.mustache","service":"ReverseProxy_$UUID"}
EOF

# 8.6. Update Synology Reverse Proxy Database
REVERSE_PROXY_JSON="/usr/syno/etc/www/ReverseProxy.json"

if [ -f "$REVERSE_PROXY_JSON" ]; then
  # Backup
  cp "$REVERSE_PROXY_JSON" "$REVERSE_PROXY_JSON.bak"
  
  # Backup
  cp "$REVERSE_PROXY_JSON" "$REVERSE_PROXY_JSON.bak"
  
  if [ -n "$PYTHON" ]; then
    # Create python update script
    cat > "$ROOT_DIR/deploy/update_proxy_json.py" <<'EOF'
import json
import sys
import os

file_path = sys.argv[1]
uuid = sys.argv[2]
domain = sys.argv[3]
port = int(sys.argv[4])
description = sys.argv[5]

try:
    with open(file_path, 'r') as f:
        data = json.load(f)
except Exception as e:
    print(f"Error loading {file_path}: {e}")
    # If file doesn't exist or is bad, start fresh? 
    # But user likely has one. If missing, maybe start simplistic.
    data = {"version": 2}

# Construct V2 Entry
new_entry = {
    "backend": {
        "fqdn": "localhost",
        "port": port,
        "protocol": 0
    },
    "customize_headers": [],
    "description": description,
    "frontend": {
        "acl": None,
        "fqdn": domain,
        "https": {
            "hsts": False
        },
        "port": 443,
        "protocol": 1
    },
    "proxy_connect_timeout": 60,
    "proxy_http_version": 1,
    "proxy_intercept_errors": False,
    "proxy_read_timeout": 60,
    "proxy_send_timeout": 60
}

data[uuid] = new_entry

# Write atomic
try:
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)
    print("Updated JSON successfully")
except Exception as e:
    print(f"Error writing JSON: {e}")
    sys.exit(1)
EOF

    echo "--> Running python to update JSON..."
    "$PYTHON" "$ROOT_DIR/deploy/update_proxy_json.py" "$REVERSE_PROXY_JSON" "$UUID" "$HOST_DOMAIN" "$TARGET_PORT" "${BASE_NAME}-${SERVICE}-${ENV_KIND}"
    rm "$ROOT_DIR/deploy/update_proxy_json.py"
    
  else
    echo "WARNING: Python no encontrado. No puedo actualizar $REVERSE_PROXY_JSON con seguridad."
    echo "Debes agregar manualmente la entrada para el UUID: $UUID"
  fi
else
  echo "Advertencia: No se encontró $REVERSE_PROXY_JSON"
fi

# 8.7. Apply TLS Profile (regenerate from mustache)
echo "--> Applying TLS Profile..."
if have synosecurityprofile; then
  synosecurityprofile --reload nginx || echo "Warning: synosecurityprofile reload failed"
fi

# 8.8. Fix ownership (critical for Synology)
chown -R root:root "/usr/syno/etc/security-profile/tls-profile/config/ReverseProxy_$UUID.conf"
chown -R root:root "/usr/syno/etc/security-profile/tls-profile/mustache/ReverseProxy_$UUID.mustache"
chown -R root:root "/usr/syno/etc/security-profile/tls-profile/services/ReverseProxy_$UUID.conf"
chown -R http:http "$SYNO_CERT_DIR"

# Test nginx config
nginx -t || die "Error en la configuración de Nginx"
# 9. Reload Nginx
echo "--> Reloading Nginx..."
if have synoservice; then
  synoservice --reload nginx || echo "Warning: synoservice reload failed"
elif have systemctl; then
    systemctl reload nginx || echo "Warning: systemctl reload failed"
else
  nginx -s reload || echo "Warning: nginx reload failed"
fi

echo "=== Done ==="
echo "Reverse Proxy creado para https://$HOST_DOMAIN -> localhost:$TARGET_PORT"
