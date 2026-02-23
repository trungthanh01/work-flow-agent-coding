---
kind: rule
area: framework
created: 2026-02-23
status: active
---

## Quy tắc 1: MOC-first (bắt buộc)
- Trước khi đọc file rải rác, phải đọc `00_moc/00_main-moc.md`.
- Mọi “điểm vào” của workflow phải nằm trong MOC/INDEX.

## Quy tắc 2: Tôn trọng dữ liệu người dùng
- User content mặc định không track Git.
- Framework update không được đụng user content.
- Khi tạo file mới trong content, phải tạo theo template và giữ anchor/index format.

