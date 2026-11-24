#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
docker compose -p openfund-demo -f compose.yaml -f docker/demo/compose.yaml --profile stack up --build --wait
