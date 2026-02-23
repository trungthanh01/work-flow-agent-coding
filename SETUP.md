# Setup
Repo này là framework. Dữ liệu người dùng (notes/logs) mặc định không track Git.

## 1) Clone và onboard (tạo content)
Tại repo:

```bash
chmod +x scripts/*.sh
./scripts/onboard.sh
```

Nó sẽ tạo (user content):
- `01_memory/MEMORY.md`
- `02_problems/frontend/INDEX.md`
- `02_problems/backend/INDEX.md`
- `04_lessons/INDEX.md`
- `03_rules/user/README.md`

## 2) Dùng với Cursor
- Mở folder repo trong Cursor
- Khi bắt đầu task, agent cần đọc: `00_moc/00_main-moc.md`

## 3) Dùng với Claude Code
- Mở repo trong Claude Code
- Nói: “Run onboarding” (agent sẽ hướng dẫn chạy `./scripts/onboard.sh` nếu chưa chạy)

## 4) Health check

```bash
./scripts/health-check.sh
```

