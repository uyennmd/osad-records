# Google Sheets

Astro can read songs from a public Google Spreadsheet during `npm run build`.
Without `GOOGLE_SHEETS_ID`, the existing Markdown song collection remains active.

Create one spreadsheet with these three tabs and exact header rows:

`Songs`

```csv
slug,title,releaseDate,album,cover,lyrics,lyricsUrl
vi-du-bai-hat,Vi du bai hat,2024-05-01,Album vi du,https://example.com/cover.jpg,"Loi bai hat nhieu dong",https://example.com/lyrics
```

`Links` (one row for each platform link):

```csv
slug,platform,url
vi-du-bai-hat,Spotify,https://open.spotify.com/track/your-track-id
vi-du-bai-hat,YouTube,https://www.youtube.com/watch?v=your-video-id
```

`Credits` (one row for each credit):

```csv
slug,role,name
vi-du-bai-hat,Sang tac,Ten tac gia
vi-du-bai-hat,San xuat,Ten nha san xuat
```

Use a unique URL-friendly `slug` in `Songs`, then repeat it in the other tabs.
Format `releaseDate` as `YYYY-MM-DD`. Lyrics can contain multiple lines.

Publish the spreadsheet to the web or grant Viewer access to anyone with the
link. The public website will expose its song data. Copy the spreadsheet ID
from its URL (`/spreadsheets/d/THIS_PART/`) into a local `.env` file:

```env
GOOGLE_SHEETS_ID=your_sheet_id
```

Then run `npm run build`. Each static build fetches the latest sheet contents;
editing the sheet alone does not deploy the site until the next build/deploy.