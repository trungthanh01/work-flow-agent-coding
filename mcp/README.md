# MCP server (local stdio)

Mục tiêu: cung cấp tools để agent “nghe ý định” và tự làm phần cơ học:
- append memory
- tạo problem + update index + gợi ý relate/solve
- rút lesson + update lessons index
- gợi ý links theo “vùng ưu tiên”
- đọc MOC nhanh (hoặc liệt kê headings)

---

## 1) Cài dependencies (1 lần)

```bash
cd mcp
pnpm install
```

## 2) Selftest nhanh

```bash
pnpm selftest
node server.mjs --selftest-suggest "memory moc lesson"
node server.mjs --selftest-research "stale request abort controller"
```

---

## 3) Cấu hình MCP trong Cursor

### A) Global (khuyến nghị)
Sửa `~/.cursor/mcp.json` và copy mẫu từ `mcp/mcp-config.example.json`.

Sau đó **thoát Cursor hoàn toàn và mở lại**.

### B) Theo repo
Tạo `<repo>/.cursor/mcp.json` và copy mẫu như trên (sửa path cho đúng máy).

---

## Tools
- Tên ngắn (khuyến nghị):
  - `get_moc`: đọc MOC (hoặc liệt kê headings)
  - `append_memory`: append vào `01_memory/MEMORY.md`
  - `capture_problem`: tạo problem note (FE/BE) + update `INDEX.md`
  - `extract_lesson`: rút lesson từ problem + update lessons index
  - `suggest_links`: gợi ý wiki links theo query
  - `research_solution`: relate + 2–3 phương án + trade-off + test/rollback
  - `health_check`: kiểm tra anchor/index/required files

- Alias cũ (giữ tương thích):
  - `wfac_get_moc`, `wfac_append_memory`, `wfac_capture_problem`, `wfac_extract_lesson`,
    `wfac_suggest_links`, `wfac_research_solution`, `wfac_health_check`

