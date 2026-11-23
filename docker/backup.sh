#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ $# -ne 1 || ! -d "$1" ]]; then
  echo "Usage: bash docker/backup.sh <existing backup directory>" >&2
  exit 2
fi

destination=$(cd -- "$1" && pwd -P)
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
cd -- "$root"
compose=(docker compose --profile stack)

# API is the only regular writer of cover files. Pause it for both copies.
running_backend=$("${compose[@]}" ps --status running --quiet backend)
backup=$(mktemp -d "$destination/openfund-$(date -u +%Y%m%dT%H%M%SZ).XXXXXX")
resume_backend() {
  if [[ -n "$running_backend" ]]; then
    "${compose[@]}" start --wait --wait-timeout 60 backend
  fi
}
trap resume_backend EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ -n "$running_backend" ]]; then
  "${compose[@]}" stop backend
fi

"${compose[@]}" exec -T postgres pg_dump -U openfund -d openfund -Fc > "$backup/database.dump"
"${compose[@]}" run --rm --no-deps -T backend \
  tar -czf - -C /app/storage/media . > "$backup/media.tar.gz"

resume_backend
trap - EXIT
touch "$backup/COMPLETE"
printf '%s\n' "$backup"
