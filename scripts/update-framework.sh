#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "Update framework (v0):"
echo "- Mục tiêu: cập nhật framework mà không đụng user content."
echo "- Hiện script này là skeleton; PRD đã chốt hành vi."
echo
echo "Gợi ý triển khai tiếp:"
echo "- add remote upstream"
echo "- --check / --dry-run / interactive apply"
echo "- backup files vào _archive/_updates/YYYY-MM-DD/"
