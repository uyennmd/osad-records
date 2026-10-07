# osad-records

Website fan archive lưu giữ bài hát, sự kiện và hành trình về OSAD, xây dựng
bằng Astro và xuất thành site tĩnh để deploy trên Vercel.

## Yêu cầu

- Git
- Node.js 22.12 trở lên
- npm (được cài kèm Node.js)

## Chạy trên máy mới

```sh
git clone https://github.com/uyennmd/osad-records.git
cd osad-records
npm install
npm run dev
```

Mở địa chỉ Astro in trong terminal, thường là <http://localhost:4321>.

## Dữ liệu

Website dùng một Google Spreadsheet gồm ba tab có tên cố định `Songs`,
`Journey`, `Events`. Để bật dữ liệu Sheet, tạo file `.env` từ `.env.example` và
điền duy nhất biến:

```env
GOOGLE_SHEETS_ID=ID_cua_spreadsheet
```

Chia sẻ Sheet ở quyền Viewer cho bất kỳ ai có liên kết. Trên Vercel, thêm
`GOOGLE_SHEETS_ID` tại **Project Settings → Environment Variables** cho môi
trường cần deploy.

- `Songs`: bài hát, link nghe nhạc và credit. `type` hợp lệ: `solo`, `collab`,
  `featured`, `other`.
- `Journey`: phỏng vấn, sự kiện, biểu diễn và các mục hành trình. `type` hợp
  lệ: `interview`, `event`, `performance`, `other`.
- `Events`: sự kiện dùng ở trang chủ và Lịch trình.

Mỗi tab có tiêu đề cột cố định; các link và credit trong `Songs` mở rộng bằng
các cột `link_<nền tảng>` và `credit_<vai trò>`. Xem cột chi tiết, quy tắc dữ
liệu, CSV mẫu, cấu hình Vercel và Deploy Hook tại
[docs/google-sheets.md](docs/google-sheets.md).

Nếu không đặt `GOOGLE_SHEETS_ID`, dữ liệu dự phòng lần lượt lấy từ Markdown
trong `src/content/songs/`, `src/data/journey.json` và `src/data/events.json`.
Không commit file `.env`; file này được loại trừ trong `.gitignore`.

## Build và xem bản build

```sh
npm run build
npm run preview
```

Khi bật Google Sheets, mỗi lần build sẽ tải dữ liệu mới nhất. Sửa nội dung
trong Sheet không tự deploy website; tạo Deploy Hook trong **Project Settings
→ Git → Deploy Hooks** để yêu cầu Vercel build lại sau khi cập nhật bảng.
