#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

for test_file in "$ROOT"/test-*.mjs; do
  printf '\n=== %s ===\n' "$(basename "$test_file")"
  node "$test_file"
done

PROSPECTING="$ROOT/../reachr-prospecting"
for test_file in \
  test-background.cjs \
  test-business-name-inference.cjs \
  test-content.js \
  test-discovery-controller.cjs \
  test-discovery-plan.cjs \
  test-discovery-runtime.cjs \
  test-messenger-utils.js \
  test-queue.cjs
do
  printf '\n=== reachr-prospecting/%s ===\n' "$test_file"
  (cd "$PROSPECTING" && node "$test_file")
done

printf '\nALL REACHR NON-LIVE TESTS PASSED\n'
