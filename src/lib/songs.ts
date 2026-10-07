import { getCollection } from 'astro:content';

type SongArtistData = {
  type?: 'solo' | 'collab' | 'featured' | 'other';
  mainArtist?: string;
  partner_1?: string;
  partner_2?: string;
  partner_3?: string;
};

// Sắp xếp theo ngày ra mắt (cũ → mới) và gán số catalog OSAD-001, 002...
export async function getSongs() {
  const songs = await getCollection('songs');
  songs.sort((a, b) => +a.data.releaseDate - +b.data.releaseDate);
  return songs.map((song, index) => ({
    ...song,
    cat: `OSAD-${String(index + 1).padStart(3, '0')}`,
  }));
}

export function getArtistDisplay(song: SongArtistData): string {
  const partners = [song.partner_1, song.partner_2, song.partner_3]
    .filter((artist): artist is string => Boolean(artist?.trim()))
    .map(artist => artist.trim());

  switch (song.type) {
    case 'solo':
      return 'OSAD';
    case 'collab':
      return partners.length ? `OSAD x ${partners.join(' x ')}` : 'OSAD';
    case 'featured':
      return song.mainArtist?.trim() ? `${song.mainArtist.trim()} ft. OSAD` : 'OSAD';
    case 'other':
      return [song.mainArtist, ...partners].filter((artist): artist is string => Boolean(artist?.trim())).join(', ');
    default:
      return '';
  }
}

export const fmtDate = (date: Date) => date.toLocaleDateString('vi-VN');
