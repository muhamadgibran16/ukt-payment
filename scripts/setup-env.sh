#!/usr/bin/env sh
# Menyiapkan file .env untuk semua service dari template .env.example masing-masing.
#
#   .env (root)        sumber kebenaran; nilai __GENERATE__ diisi secret acak
#   be/.env            backend di luar Docker (start:dev, migration, seed)
#   fe/.env            frontend di luar Docker (pnpm dev / build)
#   mock-gateway/.env  mock gateway di luar Docker
#
# Aman dijalankan ulang: urutan & komentar mengikuti template, nilai lama dipertahankan,
# KECUALI nilai yang diturunkan dari .env root (kredensial, secret, zona waktu, port),
# yang selalu disinkronkan agar semua service konsisten.
set -eu
cd "$(dirname "$0")/.."

gen() { openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

# Susun file tujuan mengikuti urutan & komentar template. Nilai yang sudah ada dipertahankan,
# key baru diambil dari template (__GENERATE__ = secret acak), key di luar template disimpan
# di bagian "Tambahan".
render_template() {
  template=$1 target=$2 tmp="$2.tmp"
  : > "$tmp"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) echo "$line" >> "$tmp"; continue ;; esac
    key="${line%%=*}"
    if [ -f "$target" ] && grep -q "^${key}=" "$target"; then
      grep -m 1 "^${key}=" "$target" >> "$tmp"
    else
      case "$line" in
        *=__GENERATE__) echo "${key}=$(gen)" >> "$tmp" ;;
        *) echo "$line" >> "$tmp" ;;
      esac
    fi
  done < "$template"

  if [ -f "$target" ]; then
    extras=$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$target" | while IFS= read -r l; do
      grep -q "^${l%%=*}=" "$template" || echo "$l"
    done)
    if [ -n "$extras" ]; then
      printf '\n# ---- Tambahan (tidak ada di template) ----\n%s\n' "$extras" >> "$tmp"
    fi
  fi
  mv "$tmp" "$target"
  chmod 600 "$target"
}

get() { grep -E "^$1=" .env | head -n 1 | cut -d= -f2-; }

# Set KEY=VALUE di file (ganti jika ada, tambah jika belum).
set_kv() {
  file=$1 key=$2 value=$3
  if grep -q "^${key}=" "$file"; then
    awk -v k="$key" -v v="$value" 'index($0, k "=") == 1 { print k "=" v; next } { print }' \
      "$file" > "$file.tmp" && mv "$file.tmp" "$file" && chmod 600 "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

render_template .env.example .env

BACKEND_LOCAL_URL="http://localhost:$(get BACKEND_HOST_PORT)"

render_template be/.env.example be/.env
set_kv be/.env TZ "$(get APP_TIMEZONE)"
set_kv be/.env PORT "$(get BACKEND_PORT)"
set_kv be/.env DB_PORT "$(get POSTGRES_HOST_PORT)"
set_kv be/.env DB_NAME "$(get POSTGRES_DB)"
set_kv be/.env DB_USER "$(get POSTGRES_USER)"
set_kv be/.env DB_PASSWORD "$(get POSTGRES_PASSWORD)"
set_kv be/.env JWT_SECRET "$(get JWT_SECRET)"
set_kv be/.env JWT_EXPIRES_IN "$(get JWT_EXPIRES_IN)"
set_kv be/.env SEED_DEMO_PASSWORD "$(get SEED_DEMO_PASSWORD)"
set_kv be/.env EXPIRY_SWEEP_INTERVAL_MS "$(get EXPIRY_SWEEP_INTERVAL_MS)"

render_template fe/.env.example fe/.env
set_kv fe/.env VITE_PROXY_TARGET "$BACKEND_LOCAL_URL"
set_kv fe/.env VITE_APP_TIMEZONE "$(get APP_TIMEZONE)"
set_kv fe/.env VITE_DEMO_PASSWORD "$(get FRONTEND_DEMO_PASSWORD)"

render_template mock-gateway/.env.example mock-gateway/.env
set_kv mock-gateway/.env PORT "$(get GATEWAY_PORT)"
set_kv mock-gateway/.env WEBHOOK_URL "$BACKEND_LOCAL_URL/api/v1/webhooks/payment-gateway"
set_kv mock-gateway/.env MAX_RETRIES "$(get GATEWAY_MAX_RETRIES)"
set_kv mock-gateway/.env RETRY_BASE_MS "$(get GATEWAY_RETRY_BASE_MS)"

for code in $(grep -o '^HMAC_SECRET_[A-Z0-9_]*' .env); do
  set_kv be/.env "$code" "$(get "$code")"
  set_kv mock-gateway/.env "$code" "$(get "$code")"
done

echo "File .env siap: .env, be/.env, fe/.env, mock-gateway/.env"
echo "Secret HMAC per institusi (kirim terpisah, jangan di-commit):"
grep '^HMAC_SECRET_' .env | sed 's/^/  /'
