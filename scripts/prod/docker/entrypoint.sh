#!/bin/sh
echo "Ensuring required extensions..."
PGPASSWORD="$PG_PASSWORD" psql \
    -h "${PG_HOST:-localhost}" \
    -p "${PG_PORT:-5432}" \
    -U "${PG_USER:-postgres}" \
    -d "${PG_DATABASE:-shaderBOT}" \
    -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

exec bun run src/index.ts
