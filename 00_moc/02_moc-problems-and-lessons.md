# MOC — Problems → Lessons
> Mục tiêu: biến “ca bệnh” thành “bài học” để dev lần sau không vấp lại.

---

## 1) Khi nào tạo problem note?
Tạo problem khi gặp:
- Bug mới có khả năng quay lại
- Sự cố vận hành (timeout, memory spike, regression)
- Edge case khó chịu cần guardrails/checklist

---

## 2) Chuẩn tối thiểu của problem
- Dấu hiệu (symptoms)
- Nguyên nhân gốc
- Ít nhất 2 phương án + trade-off
- Khuyến nghị chốt
- Fix (các bước)
- Prevention/guardrails
- Test plan
- Rollback plan
- Vết tích (file/PR/commit)
- Links liên quan

---

## 3) Lesson là gì (khác problem ở đâu?)
Problem = ca bệnh thật (đầy đủ bối cảnh).
Lesson = “phác đồ + checklist” (ngắn, tái dùng).

Lesson nên trả lời:
- Nhìn dấu hiệu gì là nghi ngay?
- Guardrails nào ngăn tái phát?
- Checklist PR (3–7 gạch) cho lần sau

