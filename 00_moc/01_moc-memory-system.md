# MOC — Memory system
> Mục tiêu: phân tầng bộ nhớ để agent không nhầm “việc đang làm” với “bài học dài hạn”.

---

## 1) Short-term memory (trong phiên)
- Nằm trong context chat + “working set” (nếu bạn tạo file làm việc dở).
- Chỉ giữ thứ giúp hoàn tất task hiện tại.

---

## 2) Long-term memory (điểm rẽ)
Ghi khi có:
- Quyết định chốt
- Bài học tránh lặp
- Guardrails/checklist cần nhớ
- Đường dẫn/vết tích để lần sau tiếp tục đúng chỗ

Khuyến nghị: 1 profile = 1 file trong `01_memory/` (user content, không track Git mặc định).

---

## 3) Kết phiên (6 dòng đủ lực)
- Ngày/phiên
- Đang giải quyết gì (1 câu)
- Đã làm xong (tối đa 3 gạch)
- Phát hiện quan trọng (1–3 gạch)
- Quyết định chốt
- Đường dẫn cần nhớ

