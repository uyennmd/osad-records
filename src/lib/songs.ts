import { getCollection } from 'astro:content';
import { parse } from 'csv-parse/sync';

type SheetRow = Record<string, string>;

function tabUrl(sheetId: string, tabName: string) {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq`);
  url.searchParams.set('tqx', 'out:csv');
  url.searchParams.set('sheet', tabName);
  return url.toString();
}

async function readSheetTab(sheetId: string, tabName: string): Promise<SheetRow[]> {
  const response = await fetch(tabUrl(sheetId, tabName));
  if (!response.ok) {
    throw new Error(`Không thể đọc tab "${tabName}" từ Google Sheets (${response.status}).`);
  }
  return parse(await response.text(), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as SheetRow[];
}

function cell(row: SheetRow, key: string) {
  return (row[key] ?? '').trim();
}

function groupRows<T>(rows: SheetRow[], mapRow: (row: SheetRow) => T) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const slug = cell(row, 'slug');
    if (!slug) continue;
    const values = grouped.get(slug) ?? [];
    values.push(mapRow(row));
    grouped.set(slug, values);
  }
  return grouped;
}

async function getSheetSongs(sheetId: string) {
  const [songRows, linkRows, creditRows] = await Promise.all([
    readSheetTab(sheetId, 'Songs'),
    readSheetTab(sheetId, 'Links'),
    readSheetTab(sheetId, 'Credits'),
  ]);
  const linksBySlug = groupRows(linkRows, row => ({
    platform: cell(row, 'platform'),
    url: cell(row, 'url'),
  }));
  const creditsBySlug = groupRows(creditRows, row => ({
    role: cell(row, 'role'),
    name: cell(row, 'name'),
  }));
  const ids = new Set<string>();

  return songRows.map(row => {
    const id = cell(row, 'slug');
    const title = cell(row, 'title');
    const releaseDate = new Date(cell(row, 'releaseDate'));
    if (!id || !title || Number.isNaN(+releaseDate)) {
      throw new Error('Mỗi dòng trong tab "Songs" cần có slug, title và releaseDate hợp lệ.');
    }
    if (ids.has(id)) throw new Error(`Slug bài hát bị trùng trong Google Sheets: "${id}".`);
    ids.add(id);

    const links = (linksBySlug.get(id) ?? []).filter(link => link.platform && link.url);
    for (const link of links) {
      try {
        new URL(link.url);
      } catch {
        throw new Error(`URL không hợp lệ trong tab "Links" của bài "${id}": ${link.url}`);
      }
    }

    return {
      id,
      fromGoogleSheet: true,
      data: {
        title,
        releaseDate,
        album: cell(row, 'album') || undefined,
        cover: cell(row, 'cover') || undefined,
        lyrics: cell(row, 'lyrics') || undefined,
        lyricsUrl: cell(row, 'lyricsUrl') || undefined,
        links,
        credits: (creditsBySlug.get(id) ?? []).filter(credit => credit.role && credit.name),
      },
      body: '',
    };
  });
}

// Sắp xếp theo ngày ra mắt (cũ → mới) và gán số catalog OSAD-001, 002...
export async function getSongs() {
  const sheetId = import.meta.env.GOOGLE_SHEETS_ID?.trim();
  const all = sheetId ? await getSheetSongs(sheetId) : await getCollection('songs');
  all.sort((a, b) => +a.data.releaseDate - +b.data.releaseDate);
  return all.map((s, i) => ({ ...s, cat: `OSAD-${String(i + 1).padStart(3, '0')}` }));
}
export const fmtDate = (d: Date) => d.toLocaleDateString('vi-VN');
