#!/bin/sh
set -eu

: "${PAYLOAD_SECRET:?Set PAYLOAD_SECRET}"
: "${DATABASE_URL:?Set DATABASE_URL}"
: "${PUBLIC_SERVER_URL:?Set PUBLIC_SERVER_URL}"

node node_modules/payload/bin.js migrate
exec node server.js
