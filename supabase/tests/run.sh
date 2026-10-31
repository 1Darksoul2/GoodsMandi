#!/usr/bin/env bash
# Runs every migration plus the policy tests against a throwaway local Postgres database.
# supabase_shim.sql stands in for the parts of Supabase the migrations depend on
# (auth.users, auth.uid(), storage, the anon/authenticated roles).
#
# Usage: DATABASE_URL=postgres://postgres@localhost/postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ADMIN_URL="${DATABASE_URL:-postgres://postgres@localhost/postgres}"
DB=goodsmandi_test
psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
TEST_URL="${ADMIN_URL%/*}/$DB"
for f in tests/supabase_shim.sql migrations/*.sql; do
  psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>&1 || { echo "Migration failed: $f"; psql "$TEST_URL" -v ON_ERROR_STOP=1 -f "$f"; exit 1; }
done
# Re-apply the latest migration to prove it is safe to re-run.
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$(ls migrations/*.sql | tail -1)" >/dev/null 2>&1
OUT=$(psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f tests/policies_test.sql 2>&1 | grep -oE '(PASS|FAIL) .*')
echo "$OUT"
PASSED=$(grep -c '^PASS' <<<"$OUT" || true)
FAILED=$(grep -c '^FAIL' <<<"$OUT" || true)
echo "----"; echo "$PASSED passed, $FAILED failed"
[ "$FAILED" -eq 0 ] && [ "$PASSED" -gt 0 ]
