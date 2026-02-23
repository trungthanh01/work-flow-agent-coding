#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "${repo_root}/_core/config.yaml" ]]; then
  echo "ERR: missing _core/config.yaml (run from repo root?)" >&2
  exit 1
fi

today="$(date '+%Y-%m-%d')"

mkdir -p \
  "${repo_root}/01_memory" \
  "${repo_root}/01_daily" \
  "${repo_root}/02_problems/frontend" \
  "${repo_root}/02_problems/backend" \
  "${repo_root}/03_rules/user" \
  "${repo_root}/04_lessons"

touch \
  "${repo_root}/01_memory/.gitkeep" \
  "${repo_root}/01_daily/.gitkeep" \
  "${repo_root}/02_problems/.gitkeep" \
  "${repo_root}/02_problems/frontend/.gitkeep" \
  "${repo_root}/02_problems/backend/.gitkeep" \
  "${repo_root}/03_rules/user/.gitkeep" \
  "${repo_root}/04_lessons/.gitkeep"

if [[ ! -f "${repo_root}/01_memory/MEMORY.md" ]]; then
  cat > "${repo_root}/01_memory/MEMORY.md" <<EOF
## MEMORY (user content)
> File này mặc định không track Git. Dùng để chốt “điểm rẽ” sau mỗi phiên.

---

### Kết phiên (mẫu)
- **Ngày/phiên**: ${today}
- **Repo nguồn**: 
- **Bạn đang giải quyết gì** (1 câu):
- **Đã làm xong**:
- **Phát hiện quan trọng**:
- **Quyết định chốt**:
- **Đường dẫn cần nhớ**:
EOF
fi

ensure_index() {
  local file="$1"
  local title="$2"
  if [[ -f "$file" ]]; then return 0; fi

  cat > "$file" <<EOF
---
kind: index
updated: ${today}
---

# ${title}

## Mục tiêu
- Trang tổng hợp sống để đọc “một mạch”.

---

## Danh sách (có nhúng nội dung)
EOF
}

ensure_index "${repo_root}/02_problems/frontend/INDEX.md" "Problems (Frontend)"
ensure_index "${repo_root}/02_problems/backend/INDEX.md" "Problems (Backend)"
ensure_index "${repo_root}/04_lessons/INDEX.md" "Lessons (Bài học)"

if [[ ! -f "${repo_root}/03_rules/user/README.md" ]]; then
  cat > "${repo_root}/03_rules/user/README.md" <<EOF
# Rules (user)
> Rules riêng của bạn/team cho tool này. Mặc định không track Git.

Gợi ý:
- Quy ước kết phiên
- Quy ước đặt tên problem/lesson
- Checklist PR cho team
EOF
fi

echo "OK: onboarded user content (not tracked by default)."
echo "- 01_memory/MEMORY.md"
echo "- 02_problems/*/INDEX.md"
echo "- 04_lessons/INDEX.md"
echo "- 03_rules/user/README.md"
