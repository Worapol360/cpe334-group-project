#!/bin/sh
set -eu

TEST_DB="${POSTGRES_DB}_test"

createdb -U "$POSTGRES_USER" "$TEST_DB"
echo "created test database: $TEST_DB"
