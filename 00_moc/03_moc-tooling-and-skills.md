# MOC — Tooling & Skills
> Mục tiêu: dùng tools/skills để làm “cơ học” (tạo file, update index, link) một cách nhất quán.

---

## 1) Skills tối thiểu (MVP)
- **Onboarding**: tạo cấu trúc content + các index/memory mẫu (không track Git)
- **Append memory**: chốt điểm rẽ
- **Capture problem**: tạo problem + gắn links + update index
- **Extract lesson**: rút lesson từ problem/fix + update lessons index
- **Health check**: kiểm tra broken links/orphans/index anchor
- **Update framework**: update khung mà không đụng user content

---

## 3) MCP tools (khi bật trong Cursor)
MCP server nằm ở `mcp/` và expose tools:
- Tên ngắn (khuyến nghị): `get_moc`, `append_memory`, `capture_problem`, `extract_lesson`, `suggest_links`, `research_solution`, `health_check`
- Alias cũ (giữ tương thích): `wfac_*`

---

## 2) Nguyên tắc an toàn
- Fail-closed khi thiếu anchor trong index (không ghi “rác”)
- Chỉ đọc/ghi trong allowlist của `_core/config.yaml`

