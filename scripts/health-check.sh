#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail=0
function require_file() {
  local p="$1"
  if [[ ! -f "${repo_root}/${p}" ]]; then
    echo "ERR: missing ${p}" >&2
    fail=1
  fi
}

require_file "_core/config.yaml"
require_file "00_moc/00_main-moc.md"
require_file "AGENTS.md"
require_file "SETUP.md"

if [[ -f "${repo_root}/02_problems/frontend/INDEX.md" ]]; then
  if ! rg -q "^## Danh sách \\(có nhúng nội dung\\)\\s*$" "${repo_root}/02_problems/frontend/INDEX.md"; then
    echo "ERR: frontend INDEX missing anchor heading" >&2
    fail=1
  fi
fi

if [[ -f "${repo_root}/02_problems/backend/INDEX.md" ]]; then
  if ! rg -q "^## Danh sách \\(có nhúng nội dung\\)\\s*$" "${repo_root}/02_problems/backend/INDEX.md"; then
    echo "ERR: backend INDEX missing anchor heading" >&2
    fail=1
  fi
fi

if [[ -f "${repo_root}/04_lessons/INDEX.md" ]]; then
  if ! rg -q "^## Danh sách \\(có nhúng nội dung\\)\\s*$" "${repo_root}/04_lessons/INDEX.md"; then
    echo "ERR: lessons INDEX missing anchor heading" >&2
    fail=1
  fi
fi

if [[ "$fail" -eq 1 ]]; then
  echo "Health check: FAILED" >&2
  exit 1
fi

echo "Health check: OK"
