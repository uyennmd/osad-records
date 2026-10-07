# Dữ liệu Google Sheets

Website có thể đọc dữ liệu từ một Google Spreadsheet gồm đúng ba tab `Songs`,
`Journey` và `Events`. Mỗi lần build, Astro tải CSV riêng của cả ba tab. Nếu
không đặt `GOOGLE_SHEETS_ID`, website dùng dữ liệu dự phòng: Markdown trong
`src/content/songs/`, `src/data/journey.json` và `src/data/events.json`.

## Cấu hình

Tạo file `.env` tại thư mục gốc (có thể sao chép `.env.example`) và điền:

```env
GOOGLE_SHEETS_ID=ID_cua_spreadsheet
```

ID là đoạn nằm giữa `/d/` và phần kế tiếp trong URL Google Sheets. Không cần
đặt tên tab trong biến môi trường vì tên ba tab đã cố định trong code. Chia sẻ
Spreadsheet với quyền **Viewer / Người xem** cho bất kỳ ai có liên kết để build
có thể đọc CSV. Không commit file `.env`; `.gitignore` đã loại trừ file này.

Trên Vercel:

1. Mở **Project Settings → Environment Variables**.
2. Thêm `GOOGLE_SHEETS_ID` với giá trị ID spreadsheet cho các môi trường cần
   deploy (Production, Preview hoặc Development).
3. Lưu và deploy lại để build đọc được bảng.

## Các tab và cột

Dòng đầu mỗi tab là tiêu đề. Tên cột và tên tab phân biệt chữ hoa/thường; giữ
đúng cách viết dưới đây. Các cột không ghi là bắt buộc có thể để trống.

### `Songs`

| Cột | Bắt buộc | Ý nghĩa |
|---|---|---|
| `slug` | Có | ID duy nhất của bài, chỉ dùng `a-z`, `0-9`, dấu gạch ngang |
| `title` | Có | Tên bài hát |
| `releaseDate` | Có | Ngày phát hành |
| `album` | Không | Album |
| `cover` | Không | URL ảnh bìa; được ưu tiên trước thumbnail YouTube |
| `lyricsUrl` | Không | URL trang lời bài hát |
| `lyrics` | Không | Lời bài hát; giữ nguyên xuống dòng |
| `notes` | Không | Ghi chú; giữ nguyên xuống dòng |
| `type` | Không | `solo`, `collab`, `featured` hoặc `other`; để trống tương đương chưa phân loại |
| `mainArtist` | Không | Nghệ sĩ chính, dùng cho `featured` và `other` |
| `partner_1` | Không | Nghệ sĩ hợp tác |
| `partner_2` | Không | Nghệ sĩ hợp tác bổ sung |
| `partner_3` | Không | Nghệ sĩ hợp tác bổ sung |

Ngoài các cột trên, thêm tùy ý các cột có tiền tố:

- `link_<nền tảng>`: giá trị là URL nghe nhạc. Ví dụ:
  `link_Spotify`, `link_Apple Music`, `link_YouTube Music`, `link_YouTube`.
  Tên nền tảng được khớp với `getPlatformConfig` để hiển thị liên kết.
- `credit_<vai trò>`: giá trị là tên người/đơn vị được ghi credit. Ví dụ:
  `credit_Sáng tác`, `credit_Viết lời`, `credit_Phối khí`,
  `credit_Sản xuất`.

Mỗi link hoặc credit dùng một cột riêng; ô trống được bỏ qua. Thêm cột link hoặc
credit mới không yêu cầu đổi schema trong code.

Nếu `cover` trống, ảnh được tìm theo thứ tự: video từ `link_YouTube Music`,
video từ `link_YouTube`, sau đó nhãn đĩa cam. Thumbnail YouTube thử
`maxresdefault.jpg`, rồi `mqdefault.jpg`.

`type` chỉ chấp nhận chính xác `solo`, `collab`, `featured`, `other`; giá trị
`guest` không còn được hỗ trợ.

### `Journey`

| Cột | Bắt buộc | Ý nghĩa |
|---|---|---|
| `slug` | Có | ID duy nhất, chỉ dùng `a-z`, `0-9`, dấu gạch ngang |
| `title` | Có | Tên phỏng vấn, sự kiện hoặc mục hành trình |
| `date` | Có | Ngày của mục |
| `type` | Có | `interview`, `event`, `performance` hoặc `other` |
| `url` | Không | Liên kết mở ngoài trang |
| `source` | Không | Nguồn hoặc kênh |
| `thumbnail` | Không | URL ảnh thu nhỏ |
| `notes` | Không | Ghi chú |

Khi `thumbnail` để trống và `url` là URL YouTube dạng `youtube.com/watch?v=`,
`youtu.be/` hoặc `/shorts/`, ảnh được suy ra tự động. Nếu vẫn không có ảnh,
`event` dùng placeholder ngày; các loại còn lại dùng placeholder màu.

### `Events`

| Cột | Bắt buộc | Ý nghĩa |
|---|---|---|
| `date` | Có | Ngày sự kiện; dòng để trống ngày được bỏ qua |
| `title` | Có | Tên sự kiện |
| `place` | Không | Địa điểm hoặc thông tin bổ sung |
| `link` | Không | URL thông tin sự kiện |

Tab này cấp dữ liệu cho trang chủ và trang Lịch trình. Trang Lịch trình vẫn giữ
nguyên giao diện hiện có.

## Ngày, ô trống và lỗi build

- Ngày trong cả ba tab nhận định dạng `YYYY-MM-DD` hoặc `DD/MM/YYYY`; dữ liệu
  được chuẩn hóa thành ISO khi tải.
- Tab `Songs` và `Journey`: dòng không có `slug` được bỏ qua. Tab `Events`:
  dòng không có `date` được bỏ qua.
- `Songs` và `Journey` phải có ít nhất một dòng dữ liệu hợp lệ; `Events` có thể
  không có sự kiện.
- Ô có dấu phẩy hoặc xuống dòng cần được CSV đặt trong dấu ngoặc kép. Parser
  hỗ trợ dấu ngoặc kép thoát bằng hai dấu ngoặc kép liên tiếp.
- Khi đã đặt `GOOGLE_SHEETS_ID`, lỗi tải tab, tiêu đề thiếu cột, slug sai/trùng,
  ngày sai, type không hợp lệ hoặc dữ liệu không qua schema sẽ làm build dừng.
  Thông báo nêu tên tab và số dòng liên quan; không chuyển âm thầm sang dữ liệu
  dự phòng.

## File mẫu

Các file CSV dưới đây minh họa tiêu đề/cấu trúc cho từng tab; có thể mở bằng
Google Sheets hoặc đối chiếu khi nhập dữ liệu:

- [Songs](./songs-template.csv)
- [Journey](./journey-template.csv)
- [Events](./events-template.csv)

File `osad-sheet-template.xlsx` chưa có trong repository tại thời điểm cập nhật
tài liệu nên chưa thể đối chiếu trực tiếp. Khi nhập file đó, bảo đảm tên tab
chính xác là `Songs`, `Journey`, `Events` và các tiêu đề bắt buộc cùng schema
trên tồn tại. Nếu workbook dùng tên/cột khác, cần đổi tên tab hoặc tiêu đề cho
khớp với bảng cột ở tài liệu này.

## Tự động build lại khi sửa Sheet

Sửa Google Sheet không tự cập nhật website. Trên Vercel, vào **Project Settings
→ Git → Deploy Hooks**, tạo Deploy Hook cho branch cần deploy và lưu URL hook.
Sau khi cập nhật sheet, gọi URL này để yêu cầu Vercel build và deploy lại. Giữ
URL hook riêng tư vì bất kỳ ai có URL đều có thể kích hoạt deploy.
