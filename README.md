# osad-records

Website lưu trữ bài hát và thông tin về OSAD, xây dựng bằng Astro.

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

Mở địa chỉ được Astro in ra trong terminal, thường là <http://localhost:4321>.

## Dữ liệu bài hát

Mặc định, website đọc bài hát trong `src/content/songs/`. Có thể thêm bài mới bằng file Markdown theo cấu trúc của `vi-du-bai-hat.md`.

Để lấy dữ liệu từ Google Sheets thay vì Markdown, tạo file `.env` từ `.env.example`, điền `GOOGLE_SHEETS_ID`, rồi cấp quyền xem cho spreadsheet. Xem cấu trúc các tab và cột tại [docs/google-sheets.md](docs/google-sheets.md). Không commit file `.env` vì nó chứa cấu hình riêng của máy.

## Build và xem bản build

```sh
npm run build
npm run preview
```

Khi bật Google Sheets, mỗi lần build sẽ tải dữ liệu mới nhất từ bảng. Sửa nội dung trong Sheet không tự deploy website; cần chạy lại build và deploy.