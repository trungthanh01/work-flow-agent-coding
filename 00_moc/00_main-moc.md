# MOC — Bản đồ nội dung (Workflow Agent Coding)
> Điểm vào bắt buộc: agent luôn đọc file này trước khi làm bất kỳ việc gì.

---

## 1) Điểm vào nhanh
- **Setup**: [[SETUP]]
- **Commands/skills (universal)**: [[AGENTS]]
- **Cấu hình nguồn sự thật**: [[_core/config.yaml]]

---

## 2) MOC theo domain
- **Memory system**: [[00_moc/01_moc-memory-system]]
- **Problems → Lessons**: [[00_moc/02_moc-problems-and-lessons]]
- **Tooling & Skills**: [[00_moc/03_moc-tooling-and-skills]]

---

## 3) Quy ước “vùng ưu tiên” (để agent nạp ít mà trúng)
1) `00_moc/` (định tuyến)
2) `03_rules/framework/` (luật nền của tool)
3) `01_memory/` (điểm rẽ theo phiên/profile)
4) `02_problems/` + `04_lessons/` (ca bệnh + bài học)

