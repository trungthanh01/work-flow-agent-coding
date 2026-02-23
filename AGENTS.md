# Workflow Agent Coding — Universal Commands
> File này là “nguồn sự thật” để nhiều agent khác nhau (Cursor, Claude Code, …) hiểu workflow và skills.

## Quy tắc bắt buộc
- Luôn đọc `00_moc/00_main-moc.md` trước khi làm việc.
- Không quét toàn repo để “tìm hiểu” khi chưa cần; dùng MOC/INDEX để định tuyến.
- Tôn trọng dữ liệu người dùng: content nằm trong `01_memory/`, `02_problems/`, `04_lessons/` mặc định không track Git.

---

## Commands/Skills (MVP)

### 1) Onboarding
**Mục tiêu:** tạo cấu trúc content + các index/memory mẫu.

**Cách làm nhanh (shell):**

```bash
./scripts/onboard.sh
```

### 2) Append memory
**Mục tiêu:** chốt “điểm rẽ” (quyết định/bài học/đường dẫn).

**Quy ước:** append ngắn 6 dòng (xem `00_moc/01_moc-memory-system.md`).

### 3) Capture problem (frontend/backend)
**Mục tiêu:** tạo problem note theo chuẩn + update index + gắn links.

**Đầu ra:**
- 1 note problem mới (trong `02_problems/<area>/`)
- 1 entry mới trong `02_problems/<area>/INDEX.md` (kèm nhúng nếu bật)

### 4) Extract lesson
**Mục tiêu:** rút “phác đồ + checklist” từ problem/fix và ghi vào `04_lessons/`.

**Đầu ra:**
- 1 lesson note mới
- update `04_lessons/INDEX.md`

### 5) Health check

```bash
./scripts/health-check.sh
```

### 6) Update framework (skeleton)

```bash
./scripts/update-framework.sh
```

