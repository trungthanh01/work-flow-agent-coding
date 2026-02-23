## Nội dung PRD để dán vào `PRD.md`

### 1) Tóm tắt
Xây dựng một repo “workflow second brain cho developer” chạy bằng **Markdown + scripts + skills cho agent**, giúp:
- Ghi nhớ (memory) theo phiên và theo dài hạn
- Ghi lại vấn đề (problems) theo chuẩn (triệu chứng → nguyên nhân → phương án → test/rollback)
- Rút ra bài học (lessons) sau mỗi fix/feature
- Tự liên kết tri thức bằng MOC/INDEX và wiki-link
- **Tôn trọng dữ liệu người dùng**: repo clone về dùng được ngay nhưng **Git không track dữ liệu người dùng** (notes/logs), chỉ track “framework”

### 2) Mục tiêu
- **MOC-first**: mọi tác vụ bắt đầu từ MOC (bảng chỉ đường) để agent không “quét rừng file”
- **Framework vs Content**:
  - Framework: skills/templates/scripts/docs/config (track Git, update được)
  - Content: notes/logs của user (mặc định **không track**)
- **Multi-agent**: dùng được với ít nhất:
  - Claude Code (qua `.claude/skills/`)
  - Cursor (qua `.cursor/*` + MCP config mẫu)
  - (tương lai) Kiro/Gemini/Codex (qua `AGENTS.md` / adapter)
- **Workflow khép kín**: Capture → Relate → Solve → Maintain → Extract lesson
- **Self-healing** tối thiểu: index/anchor/links có quy tắc để không mục nát theo thời gian

### 3) Không làm (Non-goals) ở v1
- Không build UI app/web (chỉ Markdown + scripts + agent skills)
- Không bắt buộc Vector DB/RAG (giữ đơn giản; chỉ nâng cấp khi vault quá lớn)
- Không cố làm “cross-vault wikilink chuẩn Obsidian” (v1 ưu tiên agent hiểu và hoạt động đúng)

### 4) Người dùng mục tiêu
- Dev/Lead muốn chuẩn hoá “học từ lỗi” và lưu tri thức kỹ thuật
- Team muốn clone repo về dùng như tool, nhưng vẫn giữ data riêng (không đẩy lên upstream)

### 5) Vấn đề cần giải quyết (Pain points)
- Sau 1–2 tuần: quên mất “đã chốt gì”, “tại sao sửa thế”, “đừng lặp lại”
- Notes rải rác, không có entrypoint → agent đọc lan man, tốn context
- Không có “bài học rút ra” → problems ghi xong vẫn không biến thành guardrails/checklist
- Repo framework update dễ phá data của user nếu không tách lớp rõ

### 6) Giải pháp đề xuất (Solution overview)
Repo cung cấp:
- **Cấu trúc thư mục chuẩn** (naming-as-API)
- **Templates** cho memory/problem/lesson/index/moc
- **Skills/commands** để agent tạo/cập nhật đúng file đúng chỗ
- **Scripts**: onboarding, health check, update framework
- **Gitignore mặc định**: không track user content, chỉ giữ `.gitkeep` cho cấu trúc

### 7) Cấu trúc repo (đề xuất)
#### 7.1 Framework (track Git)
- `_core/config.yaml` (nguồn sự thật)
- `00_moc/` (MOC gốc + MOC tầng 2)
- `_templates/` (problem, lesson, memory entry, index entry)
- `.claude/skills/` (Claude Code native)
- `.cursor/` (Cursor bridge + mcp config example)
- `AGENTS.md` (universal commands)
- `scripts/` (onboard, update, health)
- `docs/` (triết lý, quy tắc link, quy tắc index, cách mở rộng skill)

#### 7.2 Content (mặc định không track Git)
- `01_memory/`
- `02_problems/`
- `03_rules/` (tuỳ: rules có thể là framework hoặc content; v1 đề xuất rules nền là framework, rules dự án/user là content)
- `04_lessons/`
- `01_daily/` (tuỳ chọn)

### 8) Quy ước MOC/INDEX (bắt buộc)
- `00_moc/00_main-moc.md` là “điểm vào”
- Mỗi domain có `INDEX.md` dạng “trang tổng hợp sống”
- Index phải có **anchor heading cố định** để tool insert an toàn (fail-closed nếu lệch format)
- Mặc định **nhúng** (`![[...]]`) cho problems/lessons để đọc một mạch (cấu hình được)

### 9) Quy trình (Workflow) chuẩn
#### 9.1 Start task (Retrieve)
- Đọc MOC gốc
- Từ MOC, agent mở đúng:
  - memory profile phù hợp
  - index problems/lessons
  - rules liên quan

#### 9.2 Trong lúc làm (Capture)
- Nếu có bug/sự cố/lesson có thể tái diễn → tạo problem note
- Nếu có quyết định/điểm rẽ → append vào memory

#### 9.3 Kết thúc (Maintain + Extract lesson)
- Update index
- Tạo lesson note (ngắn, có guardrails/checklist)
- Append “điểm rẽ” vào memory để lần sau bắt đầu đúng chỗ

### 10) Bộ skill tối thiểu (MVP)
- `get_moc`: đọc MOC / liệt kê headings
- `append_memory`: append block theo profile
- `capture_problem`: tạo problem note + update index + relate/solve (gợi ý)
- `suggest_links`: gợi ý wiki links trong “vùng ưu tiên”
- `research_solution`: relate + phương án + trade-off + test/rollback
- `extract_lesson`: từ problem/fix → lesson + update lessons index
- `health_check`: broken links/orphans/index anchors
- `update_framework`: cập nhật framework mà không đụng user content (học theo COG/pm-kit)

### 11) Quy tắc “tôn trọng dữ liệu user” (Git policy)
- User content **không bị track** mặc định (giống tinh thần COG):
  - ignore `01_memory/**`, `02_problems/**`, `04_lessons/**`… nhưng giữ `.gitkeep`
- Framework files track đầy đủ để phát hành/update
- Cho phép user “bật track” nội dung nếu họ muốn dùng cho team (document rõ)

### 12) Yêu cầu phi chức năng
- **An toàn**: tool chỉ đọc/ghi trong allowlist paths
- **Ổn định**: fail-closed khi index format sai
- **Tối ưu context**: ưu tiên MOC/INDEX trước, tránh load toàn vault
- **Khả chuyển**: clone về chạy được, ít phụ thuộc máy

### 13) Tiêu chí hoàn thành (Acceptance criteria)
- Clone repo về, chạy onboarding, tạo được:
  - MOC gốc + index domain
  - 1 memory entry mẫu
  - 1 problem note mẫu + update index
  - 1 lesson note mẫu + update index
- Git status không tự dưng dính notes của user (do `.gitignore`)
- Ít nhất 2 agent chạy được:
  - Claude Code (nhận skills trong `.claude/skills/`)
  - Cursor (đọc được `AGENTS.md` + config MCP/bridge theo doc)
- Health check báo cáo được: file mồ côi / broken links / index anchor missing

### 14) Milestones gợi ý
- **M0**: scaffold cấu trúc + config + gitignore framework/content
- **M1**: MOC/INDEX/templates ổn định
- **M2**: skills tối thiểu (get_moc, append_memory, capture_problem)
- **M3**: extract_lesson + health_check
- **M4**: update_framework (cơ chế update tách lớp)

### 15) Rủi ro & cách giảm
- **Rủi ro**: đa agent đa chuẩn → lệch hành vi  
  - **Giảm**: `AGENTS.md` làm nguồn sự thật, mỗi agent có adapter mỏng
- **Rủi ro**: cross-vault trùng tên note  
  - **Giảm**: quy ước link có prefix vault trong tool layer (v1)
- **Rủi ro**: notes phình và nhiễu  
  - **Giảm**: “vùng ưu tiên” + MOC-first + nén định kỳ (lesson thay vì log dài)

---

### 16) Cơ chế update framework (không đụng user content)
Mục tiêu: cập nhật “sản phẩm” (framework) mà **không bao giờ** phá hoặc tạo conflict với dữ liệu người dùng.

Nguyên tắc:
- **Framework** luôn track Git và được phép overwrite có kiểm soát (có backup).
- **User content** mặc định **không track** Git (qua `.gitignore`) nên update không được đụng tới.
- Update phải **fail-closed**: nếu gặp file ngoài allowlist hoặc không xác định được loại file → dừng, báo lỗi rõ.

Phạm vi update (v1):
- Được update:
  - `_core/` (config, policies)
  - `00_moc/` (MOC khung)
  - `_templates/`
  - `scripts/`
  - `docs/`
  - `.claude/skills/`
  - `.cursor/` (config mẫu + bridge rules)
  - `README.md`, `SETUP.md`, `AGENTS.md`, `LICENSE`, `CHANGELOG.md` (nếu có)
- Không được update (tuyệt đối không đụng):
  - `01_memory/`, `01_daily/`, `02_problems/`, `04_lessons/`
  - `03_rules/user/` (rules riêng của user)
  - Bất kỳ thư mục “content” khác được đánh dấu trong `_core/config.yaml`

Cách update đề xuất (giống tinh thần COG):
- Có script `scripts/update-framework.sh` với 3 chế độ:
  - `--check`: so phiên bản hiện tại với upstream, in danh sách file framework sẽ thay đổi
  - `--dry-run`: hiển thị diff/preview (không ghi)
  - chạy thường: interactive từng nhóm file (keep yours / use upstream / backup + update)
- Có `FRAMEWORK_VERSION` hoặc `VERSION` file để biết đang ở bản nào.

Yêu cầu UX:
- Luôn tạo backup vào `_archive/_updates/YYYY-MM-DD/` khi overwrite file đã được chỉnh tay.
- Luôn in rõ “đã update gì” và “không đụng gì” để user yên tâm.

---

### 1 góp ý nhỏ nhưng rất “đắt”
Repo mới của bạn đang hướng tới “đóng gói trả phí” sau này. Vậy ngay từ PRD, bạn nên coi:
- **Framework là sản phẩm**
- **User content là dữ liệu khách hàng**  
→ Gitignore mặc định như COG là lựa chọn đúng.

Nếu bạn muốn, mình có thể viết thêm 1 mục trong PRD về **“Cơ chế update framework (không đụng user content)”** theo đúng kiểu `COG-second-brain/cog-update.sh` và `pm-kit` (nhưng vẫn giữ ở mức PRD, chưa viết script).