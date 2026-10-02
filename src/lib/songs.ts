import { getCollection } from 'astro:content';

// Sắp xếp theo ngày ra mắt (cũ → mới) và gán số catalog OSAD-001, 002...
export async function getSongs() {
  const all = (await getCollection('songs')).sort((a, b) => +a.data.releaseDate - +b.data.releaseDate);
  return all.map((s, i) => ({ ...s, cat: `OSAD-${String(i + 1).padStart(3, '0')}` }));
}
export const fmtDate = (d: Date) => d.toLocaleDateString('vi-VN');
