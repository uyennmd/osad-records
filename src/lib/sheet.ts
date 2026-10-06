import { env as processEnv } from 'node:process';
import { loadEnv } from 'vite';
import type { Loader } from 'astro/loaders';

type SheetConfig = {
  id: string;
  tab: string;
};

type CsvRecord = {
  values: string[];
  line: number;
};

type SongData = {
  title: string;
  releaseDate: string;
  album?: string;
  cover?: string;
  lyricsUrl?: string;
  lyrics?: string;
  notes?: string;
  type?: 'solo' | 'guest' | 'featured' | 'collab' | 'other';
  mainArtist?: string;
  partner_1?: string;
  partner_2?: string;
  partner_3?: string;
  links: Array<{ platform: string; url: string }>;
  credits: Array<{ role: string; name: string }>;
};

const songTypes = ['solo', 'guest', 'featured', 'collab', 'other'] as const;

function isSongType(value: string): value is NonNullable<SongData['type']> {
  return songTypes.some(type => type === value);
}

export function getGoogleSheetsConfig(): SheetConfig | undefined {
  const mode = processEnv.NODE_ENV === 'production' ? 'production' : 'development';
  const fileEnv = loadEnv(mode, process.cwd(), 'GOOGLE_SHEETS_');
  const sheetId = (processEnv.GOOGLE_SHEETS_ID ?? fileEnv.GOOGLE_SHEETS_ID)?.trim();

  if (!sheetId) return undefined;

  return {
    id: sheetId,
    tab: (processEnv.GOOGLE_SHEETS_TAB ?? fileEnv.GOOGLE_SHEETS_TAB)?.trim() || 'Songs',
  };
}

function parseCsv(csv: string): CsvRecord[] {
  if (csv.startsWith('\uFEFF')) csv = csv.slice(1);

  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let afterQuote = false;
  let quoteLine = 1;
  let line = 1;
  let recordLine = 1;

  const finishField = () => {
    fields.push(field);
    field = '';
  };
  const finishRecord = () => {
    finishField();
    records.push({ values: fields, line: recordLine });
    fields = [];
  };

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];

    if (inQuotes) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else if (character === '\r' || character === '\n') {
        if (character === '\r' && csv[index + 1] === '\n') index += 1;
        field += '\n';
        line += 1;
      } else {
        field += character;
      }
      continue;
    }

    if (afterQuote) {
      if (character === ',') {
        finishField();
        afterQuote = false;
      } else if (character === '\r' || character === '\n') {
        if (character === '\r' && csv[index + 1] === '\n') index += 1;
        finishRecord();
        line += 1;
        recordLine += 1;
        afterQuote = false;
      } else {
        throw new Error(`CSV không hợp lệ ở dòng ${line}: có ký tự sau dấu ngoặc kép đóng.`);
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new Error(`CSV không hợp lệ ở dòng ${line}: dấu ngoặc kép không đúng vị trí.`);
      }
      inQuotes = true;
      quoteLine = line;
    } else if (character === ',') {
      finishField();
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && csv[index + 1] === '\n') index += 1;
      finishRecord();
      line += 1;
      recordLine += 1;
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new Error(`CSV không hợp lệ ở dòng ${quoteLine}: ô chưa đóng dấu ngoặc kép.`);
  }
  if (field.length > 0 || fields.length > 0) finishRecord();

  return records.filter(record => record.values.some(value => value.trim() !== ''));
}

function optionalCell(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeDate(value: string, rowNumber: number, slug: string): string {
  let year: number;
  let month: number;
  let day: number;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [year, month, day] = value.split('-').map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    [day, month, year] = value.split('/').map(Number);
  } else {
    throw new Error(`Dòng ${rowNumber} (slug "${slug}") có releaseDate không hợp lệ: "${value}". Dùng YYYY-MM-DD hoặc DD/MM/YYYY.`);
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (year >= 0 && year <= 99) date.setUTCFullYear(year);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Dòng ${rowNumber} (slug "${slug}") có releaseDate không hợp lệ: "${value}".`);
  }

  return date.toISOString().slice(0, 10);
}

function columnValues(
  headers: string[],
  values: string[],
  prefix: 'link_' | 'credit_',
): Array<{ name: string; value: string }> {
  return headers.flatMap((header, index) => {
    if (!header.startsWith(prefix)) return [];
    const name = header.slice(prefix.length).trim();
    const value = optionalCell(values[index]);
    return name && value ? [{ name, value }] : [];
  });
}

function makeSongData(
  headers: string[],
  values: string[],
  rowNumber: number,
  slug: string,
): SongData {
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  const rawType = optionalCell(row.type);
  if (rawType && !isSongType(rawType)) {
    throw new Error(`Dòng ${rowNumber} (slug "${slug}") có type không hợp lệ: "${rawType}". Giá trị cho phép: solo, guest, featured, collab, other.`);
  }

  const links = columnValues(headers, values, 'link_').map(({ name, value }) => ({
    platform: name,
    url: value,
  }));
  const credits = columnValues(headers, values, 'credit_').map(({ name, value }) => ({
    role: name,
    name: value,
  }));

  for (const link of links) {
    try {
      new URL(link.url);
    } catch {
      throw new Error(`Dòng ${rowNumber} (slug "${slug}") có URL không hợp lệ ở cột link_${link.platform}: "${link.url}".`);
    }
  }

  const lyricsUrl = optionalCell(row.lyricsUrl);
  if (lyricsUrl) {
    try {
      new URL(lyricsUrl);
    } catch {
      throw new Error(`Dòng ${rowNumber} (slug "${slug}") có lyricsUrl không hợp lệ: "${lyricsUrl}".`);
    }
  }

  return {
    title: optionalCell(row.title) ?? '',
    releaseDate: normalizeDate(optionalCell(row.releaseDate) ?? '', rowNumber, slug),
    album: optionalCell(row.album),
    cover: optionalCell(row.cover),
    lyricsUrl,
    lyrics: optionalCell(row.lyrics),
    notes: optionalCell(row.notes),
    type: rawType,
    mainArtist: optionalCell(row.mainArtist),
    partner_1: optionalCell(row.partner_1),
    partner_2: optionalCell(row.partner_2),
    partner_3: optionalCell(row.partner_3),
    links,
    credits,
  };
}

function makeSheetUrl({ id, tab }: SheetConfig): string {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq`);
  url.searchParams.set('tqx', 'out:csv');
  url.searchParams.set('sheet', tab);
  return url.toString();
}

async function fetchSheetCsv(config: SheetConfig): Promise<string> {
  let response: Response;
  try {
    response = await fetch(makeSheetUrl(config));
  } catch (error) {
    throw new Error(`Không thể tải Google Sheet (tab "${config.tab}"): ${error instanceof Error ? error.message : String(error)}. Kiểm tra kết nối mạng và quyền xem bằng liên kết.`);
  }

  if (!response.ok) {
    throw new Error(`Không thể tải Google Sheet (tab "${config.tab}", HTTP ${response.status}). Kiểm tra GOOGLE_SHEETS_ID, tên tab và quyền xem "ai có liên kết".`);
  }

  const csv = await response.text();
  if (/^\s*(?:<!doctype html|<html|google\.visualization\.query\.setresponse)/i.test(csv)) {
    throw new Error(`Google Sheets không trả về CSV cho tab "${config.tab}". Kiểm tra ID, tên tab và bật quyền xem "ai có liên kết".`);
  }
  return csv;
}

export function googleSheetsLoader(config: SheetConfig): Loader {
  return {
    name: 'google-sheets-songs-loader',
    async load({ store, parseData, generateDigest }) {
      store.clear();

      const csv = await fetchSheetCsv(config);
      let records: CsvRecord[];
      try {
        records = parseCsv(csv);
      } catch (error) {
        throw new Error(`Không thể đọc Google Sheet (tab "${config.tab}"): ${error instanceof Error ? error.message : String(error)}`);
      }

      const headerRecord = records[0];
      if (!headerRecord) {
        throw new Error(`Google Sheet (tab "${config.tab}") không có dữ liệu. Cần dòng tiêu đề và ít nhất một bài hát.`);
      }

      const headers = headerRecord.values.map(header => header.trim());
      for (const required of ['slug', 'title']) {
        if (!headers.includes(required)) {
          throw new Error(`Dòng ${headerRecord.line} (tiêu đề) trong tab "${config.tab}" thiếu cột bắt buộc "${required}". Kiểm tra tên tab và dòng tiêu đề.`);
        }
      }
      const duplicateHeader = headers.find((header, index) => headers.indexOf(header) !== index);
      if (duplicateHeader) {
        throw new Error(`Dòng ${headerRecord.line} trong tab "${config.tab}" có cột bị trùng: "${duplicateHeader}".`);
      }

      let songCount = 0;
      const seenSlugs = new Set<string>();
      for (const record of records.slice(1)) {
        const values = headers.map((_, index) => record.values[index] ?? '');
        const slug = optionalCell(values[headers.indexOf('slug')]);
        if (!slug) continue;

        if (!/^[a-z0-9-]+$/.test(slug)) {
          throw new Error(`Dòng ${record.line} có slug không hợp lệ: "${slug}". Chỉ dùng chữ thường a-z, chữ số 0-9 và dấu gạch ngang.`);
        }
        if (seenSlugs.has(slug)) {
          throw new Error(`Dòng ${record.line} có slug bị trùng: "${slug}".`);
        }
        seenSlugs.add(slug);

        const title = optionalCell(values[headers.indexOf('title')]);
        if (!title) {
          throw new Error(`Dòng ${record.line} (slug "${slug}") thiếu title.`);
        }

        const data = makeSongData(headers, values, record.line, slug);
        try {
          const parsedData = await parseData({ id: slug, data });
          store.set({
            id: slug,
            data: parsedData,
            digest: generateDigest(data),
          });
        } catch (error) {
          throw new Error(`Dòng ${record.line} (slug "${slug}") không hợp lệ theo schema bài hát: ${error instanceof Error ? error.message : String(error)}`);
        }
        songCount += 1;
      }

      if (songCount === 0) {
        throw new Error(`Google Sheet (tab "${config.tab}") không có bài hát nào. Cần ít nhất một dòng có slug để tránh build site rỗng.`);
      }
    },
  };
}
