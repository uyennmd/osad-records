import { env as processEnv } from 'node:process';
import { loadEnv } from 'vite';
import type { Loader } from 'astro/loaders';
import { parseArtistCell } from './artists';

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
  type?: 'solo' | 'collab' | 'featured' | 'other';
  artistDisplay?: string;
  artists: string[];
  links: Array<{ platform: string; url: string }>;
  credits: Array<{ role: string; name: string }>;
};

type JourneyData = {
  title: string;
  date: string;
  type: 'interview' | 'event' | 'performance' | 'other';
  url?: string;
  source?: string;
  thumbnail?: string;
  notes?: string;
};

type EventData = {
  date: string;
  title: string;
  place?: string;
  link?: string;
};

type SheetTab = 'Songs' | 'Journey' | 'Events';

const songTypes = ['solo', 'collab', 'featured', 'other'] as const;
const journeyTypes = ['interview', 'event', 'performance', 'other'] as const;

function isSongType(value: string): value is NonNullable<SongData['type']> {
  return songTypes.some(type => type === value);
}

function isJourneyType(value: string): value is JourneyData['type'] {
  return journeyTypes.some(type => type === value);
}

export function getGoogleSheetsId(): string | undefined {
  const mode = processEnv.NODE_ENV === 'production' ? 'production' : 'development';
  const fileEnv = loadEnv(mode, process.cwd(), 'GOOGLE_SHEETS_');
  const sheetId = (processEnv.GOOGLE_SHEETS_ID ?? fileEnv.GOOGLE_SHEETS_ID)?.trim();
  return sheetId || undefined;
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
        recordLine = line;
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
      recordLine = line;
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new Error(`CSV không hợp lệ ở dòng ${quoteLine}: ô chưa đóng dấu ngoặc kép.`);
  }
  if (field.length > 0 || fields.length > 0 || afterQuote) finishRecord();

  return records.filter(record => record.values.some(value => value.trim() !== ''));
}

function optionalCell(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeDate(value: string, rowNumber: number, tab: SheetTab): string {
  let year: number;
  let month: number;
  let day: number;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [year, month, day] = value.split('-').map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    [day, month, year] = value.split('/').map(Number);
  } else {
    throw new Error(`Tab "${tab}", dòng ${rowNumber}: ngày không hợp lệ "${value}". Dùng YYYY-MM-DD hoặc DD/MM/YYYY.`);
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (year >= 0 && year <= 99) date.setUTCFullYear(year);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Tab "${tab}", dòng ${rowNumber}: ngày không hợp lệ "${value}".`);
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

function youtubeVideoId(urlValue: string | undefined, platform: string): string | undefined {
  if (!urlValue) return undefined;
  const platformName = platform.trim().toLowerCase();

  try {
    const url = new URL(urlValue);
    if (platformName === 'youtube music' && url.hostname.toLowerCase() === 'music.youtube.com') {
      return url.pathname === '/watch' ? url.searchParams.get('v') ?? undefined : undefined;
    }
    if (platformName === 'youtube') {
      if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname.toLowerCase())) {
        return url.pathname === '/watch' ? url.searchParams.get('v') ?? undefined : undefined;
      }
      if (url.hostname.toLowerCase() === 'youtu.be') {
        return url.pathname.split('/').filter(Boolean)[0];
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function youtubeCover(links: Array<{ platform: string; url: string }>): string | undefined {
  const youtubeMusic = links.find(link => link.platform.trim().toLowerCase() === 'youtube music');
  const youtube = links.find(link => link.platform.trim().toLowerCase() === 'youtube');
  const videoId = youtubeVideoId(youtubeMusic?.url, 'youtube music')
    ?? youtubeVideoId(youtube?.url, 'youtube');
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined;
}

function makeSongData(
  headers: string[],
  values: string[],
  rowNumber: number,
): SongData {
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  const rawType = optionalCell(row.type);
  if (rawType && !isSongType(rawType)) {
    throw new Error(`Tab "Songs", dòng ${rowNumber}: type không hợp lệ "${rawType}". Giá trị cho phép: ${songTypes.join(', ')}.`);
  }

  const links = columnValues(headers, values, 'link_').map(({ name, value }) => ({
    platform: name,
    url: value,
  }));
  const credits = columnValues(headers, values, 'credit_').map(({ name, value }) => ({
    role: name,
    name: value,
  }));
  const artists = parseArtistCell(row.artists ?? '');
  const cover = optionalCell(row.cover) ?? youtubeCover(links);

  for (const link of links) {
    try {
      new URL(link.url);
    } catch {
      throw new Error(`Tab "Songs", dòng ${rowNumber}: URL không hợp lệ ở cột link_${link.platform}: "${link.url}".`);
    }
  }

  const lyricsUrl = optionalCell(row.lyricsUrl);
  if (lyricsUrl) {
    try {
      new URL(lyricsUrl);
    } catch {
      throw new Error(`Tab "Songs", dòng ${rowNumber}: lyricsUrl không hợp lệ "${lyricsUrl}".`);
    }
  }

  return {
    title: optionalCell(row.title) ?? '',
    releaseDate: normalizeDate(optionalCell(row.releaseDate) ?? '', rowNumber, 'Songs'),
    album: optionalCell(row.album),
    cover,
    lyricsUrl,
    lyrics: row.lyrics || undefined,
    notes: row.notes || undefined,
    type: rawType,
    artistDisplay: row.artistDisplay.trim() ? row.artistDisplay : undefined,
    artists,
    links,
    credits,
  };
}

function makeJourneyData(headers: string[], values: string[], rowNumber: number): JourneyData {
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  const type = optionalCell(row.type);
  if (!type || !isJourneyType(type)) {
    throw new Error(`Tab "Journey", dòng ${rowNumber}: type không hợp lệ "${type ?? ''}". Giá trị cho phép: ${journeyTypes.join(', ')}.`);
  }

  const url = optionalCell(row.url);
  const source = optionalCell(row.source);
  let thumbnail = optionalCell(row.thumbnail);
  if (!thumbnail && url) {
    const videoId = url.match(/(?:youtube\.com\/watch\?[^#]*v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/)?.[1];
    if (videoId) thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  return {
    title: optionalCell(row.title) ?? '',
    date: normalizeDate(optionalCell(row.date) ?? '', rowNumber, 'Journey'),
    type,
    url,
    source,
    thumbnail,
    notes: row.notes || undefined,
  };
}

function makeEventData(headers: string[], values: string[], rowNumber: number): EventData {
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  return {
    date: normalizeDate(optionalCell(row.date) ?? '', rowNumber, 'Events'),
    title: optionalCell(row.title) ?? '',
    place: optionalCell(row.place),
    link: optionalCell(row.link),
  };
}

function sheetUrl(id: string, tab: SheetTab): string {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq`);
  url.searchParams.set('tqx', 'out:csv');
  url.searchParams.set('sheet', tab);
  return url.toString();
}

async function fetchSheetCsv(id: string, tab: SheetTab): Promise<string> {
  let response: Response;
  try {
    response = await fetch(sheetUrl(id, tab));
  } catch (error) {
    throw new Error(`Không thể tải Google Sheets tab "${tab}": ${error instanceof Error ? error.message : String(error)}. Kiểm tra kết nối mạng và quyền xem bằng liên kết.`);
  }

  if (!response.ok) {
    throw new Error(`Không thể tải Google Sheets tab "${tab}" (HTTP ${response.status}). Kiểm tra GOOGLE_SHEETS_ID, tên tab và quyền xem "ai có liên kết".`);
  }

  const csv = await response.text();
  if (/^\s*(?:<!doctype html|<html|google\.visualization\.query\.setresponse)/i.test(csv)) {
    throw new Error(`Google Sheets không trả về CSV cho tab "${tab}". Kiểm tra ID, tên tab và bật quyền xem "ai có liên kết".`);
  }
  return csv;
}

function sheetLoader<T>(
  id: string,
  tab: SheetTab,
  requiredHeaders: string[],
  makeData: (headers: string[], values: string[], rowNumber: number) => T,
  hasSlug: boolean,
): Loader {
  return {
    name: `google-sheets-${tab.toLowerCase()}-loader`,
    async load({ store, parseData, generateDigest }) {
      store.clear();

      const csv = await fetchSheetCsv(id, tab);
      let records: CsvRecord[];
      try {
        records = parseCsv(csv);
      } catch (error) {
        throw new Error(`Không thể đọc Google Sheets tab "${tab}": ${error instanceof Error ? error.message : String(error)}`);
      }

      const headerRecord = records[0];
      if (!headerRecord) {
        throw new Error(`Google Sheets tab "${tab}" không có dòng tiêu đề.`);
      }
      const headers = headerRecord.values.map(header => header.trim());
      for (const required of requiredHeaders) {
        if (!headers.includes(required)) {
          throw new Error(`Google Sheets tab "${tab}", dòng ${headerRecord.line}: thiếu cột bắt buộc "${required}".`);
        }
      }
      const duplicateHeader = headers.find((header, index) => headers.indexOf(header) !== index);
      if (duplicateHeader) {
        throw new Error(`Google Sheets tab "${tab}", dòng ${headerRecord.line}: cột bị trùng "${duplicateHeader}".`);
      }

      let entryCount = 0;
      const seenSlugs = new Set<string>();
      for (const record of records.slice(1)) {
        const values = headers.map((_, index) => record.values[index] ?? '');
        const slug = hasSlug ? optionalCell(values[headers.indexOf('slug')]) : undefined;
        if (hasSlug && !slug) continue;

        if (slug && !/^[a-z0-9-]+$/.test(slug)) {
          throw new Error(`Google Sheets tab "${tab}", dòng ${record.line}: slug không hợp lệ "${slug}". Chỉ dùng chữ thường a-z, chữ số 0-9 và dấu gạch ngang.`);
        }
        if (slug && seenSlugs.has(slug)) {
          throw new Error(`Google Sheets tab "${tab}", dòng ${record.line}: slug bị trùng "${slug}".`);
        }
        if (slug) seenSlugs.add(slug);

        if (tab === 'Events' && !optionalCell(values[headers.indexOf('date')])) continue;

        const title = optionalCell(values[headers.indexOf('title')]);
        if (!title) {
          throw new Error(`Google Sheets tab "${tab}", dòng ${record.line}${slug ? ` (slug "${slug}")` : ''}: thiếu title.`);
        }

        const data = makeData(headers, values, record.line);
        const idValue = slug ?? `event-${entryCount + 1}`;
        try {
          const parsedData = await parseData({ id: idValue, data });
          store.set({
            id: idValue,
            data: parsedData,
            digest: generateDigest(data),
          });
        } catch (error) {
          throw new Error(`Google Sheets tab "${tab}", dòng ${record.line}${slug ? ` (slug "${slug}")` : ''}: dữ liệu không hợp lệ theo schema: ${error instanceof Error ? error.message : String(error)}`);
        }
        entryCount += 1;
      }

      if (tab !== 'Events' && entryCount === 0) {
        throw new Error(`Google Sheets tab "${tab}" không có dòng dữ liệu hợp lệ. Cần ít nhất một dòng có slug.`);
      }
    },
  };
}

export function googleSheetsSongsLoader(id: string): Loader {
  return sheetLoader(id, 'Songs', ['slug', 'title', 'releaseDate'], makeSongData, true);
}

export function googleSheetsJourneyLoader(id: string): Loader {
  return sheetLoader(id, 'Journey', ['slug', 'title', 'date', 'type'], makeJourneyData, true);
}

export function googleSheetsEventsLoader(id: string): Loader {
  return sheetLoader(id, 'Events', ['date', 'title'], makeEventData, false);
}

export function staticDataLoader(
  name: string,
  items: Array<Record<string, unknown>>,
  getId: (item: Record<string, unknown>, index: number) => string,
): Loader {
  return {
    name: `${name}-static-loader`,
    async load({ store, parseData, generateDigest }) {
      store.clear();
      for (const [index, item] of items.entries()) {
        const id = getId(item, index);
        const parsedData = await parseData({ id, data: item });
        store.set({ id, data: parsedData, digest: generateDigest(item) });
      }
    },
  };
}
