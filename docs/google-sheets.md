# Dữ liệu bài hát từ Google Sheets

Khi có `GOOGLE_SHEETS_ID`, Astro tải dữ liệu từ một tab duy nhất trong Google
Sheets ở mỗi lần build. Nếu không có biến này, website tiếp tục đọc Markdown từ
`src/content/songs/` như hiện tại.

## Cấu hình

Tạo file `.env` ở thư mục gốc (hoặc sao chép `.env.example`) và đặt:

```env
GOOGLE_SHEETS_ID=ID_cua_spreadsheet
GOOGLE_SHEETS_TAB=Songs
```

`GOOGLE_SHEETS_TAB` là tùy chọn, mặc định là `Songs`. ID nằm giữa `/d/` và phần
tiếp theo trong URL spreadsheet. Cho phép quyền xem bằng liên kết (Viewer) để
build có thể tải CSV. Không commit file `.env`; file này đã nằm trong
`.gitignore`.

Trên Vercel, mở **Project Settings → Environment Variables**, thêm
`GOOGLE_SHEETS_ID` (và tùy chọn `GOOGLE_SHEETS_TAB`) cho các môi trường cần
deploy, rồi lưu và deploy lại.

## Cấu trúc tab

Tab có một dòng tiêu đề và mỗi dòng tiếp theo là một bài hát. Các cột cố định
theo schema:

```text
slug, title, releaseDate, album, cover, lyricsUrl, lyrics, type,
mainArtist, partner_1, partner_2, partner_3
```

Có thể thêm tùy ý các cột động:

- `link_<tên nền tảng>`: mỗi ô có URL sẽ tạo một link nghe nhạc, ví dụ
  `link_Spotify`, `link_Apple Music`, `link_YouTube Music`.
- `credit_<vai trò>`: mỗi ô có tên sẽ tạo một credit, ví dụ
  `credit_Sáng tác`, `credit_Phối khí`.

Tên nền tảng/vai trò là phần sau tiền tố và được giữ nguyên. Muốn thêm nền tảng
hoặc vai trò chỉ cần thêm cột mới với tiền tố tương ứng; cột trống được bỏ qua.
Mỗi thông tin phải ở cột riêng, không gộp nhiều link, credit hay nghệ sĩ bằng
dấu phẩy. Có thể nhập file mẫu [songs-template.csv](./songs-template.csv) vào
Google Sheets.

## Quy tắc dữ liệu

- `slug` là ID duy nhất của bài, chỉ gồm chữ thường `a-z`, số `0-9` và dấu
  gạch ngang. Dòng không có slug được bỏ qua.
- `title` là bắt buộc. Dòng tiêu đề phải có cả cột `slug` và `title`.
- `releaseDate` dùng `YYYY-MM-DD` hoặc `DD/MM/YYYY`.
- `type` có thể để trống; nếu nhập, chỉ chấp nhận `solo`, `guest`, `featured`,
  `collab` hoặc `other`.
- Ô trống ở cột tùy chọn được coi là không có giá trị. `lyrics` giữ nguyên
  xuống dòng; Google Sheets cho xuống dòng bên trong ô bằng Alt+Enter.
- Sheet phải có ít nhất một bài hát có slug. Lỗi tải sheet, tiêu đề, slug trùng
  hoặc sai định dạng, ngày sai và `type` không hợp lệ đều làm build dừng; lỗi
  dữ liệu nêu số dòng trong sheet.

## Tự động build lại khi sửa sheet

Thay đổi Google Sheet không tự cập nhật website. Trên Vercel, vào
**Project Settings → Git → Deploy Hooks**, tạo hook cho branch cần deploy và
lưu URL hook. Sau khi sửa sheet, gọi URL Deploy Hook để yêu cầu Vercel build
và deploy lại. Giữ URL hook riêng tư vì ai có URL đều có thể kích hoạt deploy.
