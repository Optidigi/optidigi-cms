#!/usr/bin/env bash
# Upgrade check: the release before this one writes some content, then this release starts on
# the same database (running its migrations at startup, as in production) and must still serve it.
#
#   scripts/upgrade-check.sh <previous image> <new image> <database URL of an empty database>
#
# Needs Docker and curl; the database must be reachable from containers on the host network.
set -euo pipefail

previous="$1"
next="$2"
database="$3"
port=3100
base="http://localhost:$port"
secret="upgrade-check-$RANDOM$RANDOM"
work="$(mktemp -d)"
name=optidigi-cms-upgrade

cleanup() {
  docker logs "$name" 2>/dev/null | tail -40 || true
  docker rm -f "$name" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

start() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker run --detach --name "$name" --network host \
    --env DATABASE_URL="$database" --env PAYLOAD_SECRET="$secret" \
    --env PUBLIC_SERVER_URL="$base" --env PORT="$port" \
    --volume "$work/uploads:/app/uploads" "$1" >/dev/null
  curl --fail --silent --show-error --retry 45 --retry-delay 2 --retry-all-errors --max-time 5 \
    "$base/api/health" >/dev/null
}

# Signs in as the operator and prints the token.
token() {
  curl --fail --silent --show-error -H 'Content-Type: application/json' \
    -d "{\"email\":\"operator@example.test\",\"password\":\"$(cat "$work/password")\"}" \
    "$base/api/users/login" | node -pe 'JSON.parse(require("fs").readFileSync(0)).token'
}

mkdir -p "$work/uploads"
chmod 777 "$work/uploads"
openssl rand -hex 24 > "$work/password"
chmod 644 "$work/password"

echo "Starting the previous release ($previous)"
start "$previous"
docker exec --interactive --env OPS_BOOTSTRAP_EMAIL=operator@example.test \
  --env OPS_BOOTSTRAP_PASSWORD_FILE=/tmp/operator-password "$name" sh -ec \
  "cat > /tmp/operator-password && node node_modules/payload/bin.js bootstrap-operator" < "$work/password"
auth="Authorization: JWT $(token)"
json=(-H "$auth" -H 'Content-Type: application/json')
tenant="$(curl --fail --silent --show-error "${json[@]}" \
  -d '{"name":"Upgrade","slug":"upgrade","siteOrigin":"https://example.com"}' \
  "$base/api/tenants" | node -pe 'JSON.parse(require("fs").readFileSync(0)).doc.id')"
curl --fail --silent --show-error "${json[@]}" \
  -d "{\"tenant\":$tenant,\"slug\":\"home\",\"title\":\"Home\",\"heading\":\"Written before the upgrade\",\"_status\":\"published\"}" \
  "$base/api/pages?locale=nl" >/dev/null
curl --fail --silent --show-error "${json[@]}" \
  -d "{\"tenant\":$tenant,\"name\":\"Upgrade\",\"_status\":\"published\"}" \
  "$base/api/site-settings" >/dev/null
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' |
  base64 -d > "$work/dot.png"
media_url="$(curl --fail --silent --show-error -H "$auth" -F "file=@$work/dot.png;type=image/png" \
  --form-string "_payload={\"alt\":\"Dot\",\"tenant\":$tenant}" \
  "$base/api/media" | node -pe 'JSON.parse(require("fs").readFileSync(0)).doc.url')"

echo "Starting this release ($next) on the same database"
start "$next"
auth="Authorization: JWT $(token)"
heading="$(curl --fail --silent --show-error "$base/api/pages?where%5Btenant.slug%5D%5Bequals%5D=upgrade&locale=nl&depth=0" |
  node -pe 'JSON.parse(require("fs").readFileSync(0)).docs[0]?.heading')"
test "$heading" = "Written before the upgrade" || { echo "::error::The page written before the upgrade is gone ($heading)"; exit 1; }
# Payload returns the file URL with the server address in front.
curl --fail --silent --show-error --output /dev/null "$media_url"
curl --fail --silent --show-error --output /dev/null -H "$auth" "$base/api/site-settings?where%5Btenant%5D%5Bequals%5D=$tenant"
curl --fail --silent --show-error --output /dev/null "$base/admin/login"
echo "Upgrade check passed: content, media and sign-in survive the upgrade."
