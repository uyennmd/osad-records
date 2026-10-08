import { getCollection } from 'astro:content';

export { getArtistDisplay } from './artists';

// Sắp xếp theo ngày ra mắt (cũ → mới) và gán số catalog OSAD-001, 002...
export async function getSongs() {
  const songs = await getCollection('songs');
  songs.sort((a, b) => +a.data.releaseDate - +b.data.releaseDate);
  return songs.map((song, index) => ({
    ...song,
    cat: `OSAD-${String(index + 1).padStart(3, '0')}`,
  }));
}

export const fmtDate = (date: Date) => date.toLocaleDateString('vi-VN');
