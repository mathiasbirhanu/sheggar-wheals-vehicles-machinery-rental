#!/bin/sh
# Boot sequence: apply pending migrations, then hand off to the Next server.
# `exec` ensures the Node process is PID 1 and receives SIGTERM directly.
set -eu

echo "[entrypoint] applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "[entrypoint] starting Sheggar Wheels on port ${PORT:-3000}..."
exec node server.js
