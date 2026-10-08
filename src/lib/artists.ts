export type SongArtistData = {
  artistDisplay?: string;
  artists?: string[];
};

export function normalizeArtists(artists: string[]): string[] {
  const seen = new Set<string>();
  return artists.flatMap((artist) => {
    const name = artist.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return [];
    seen.add(key);
    return [name];
  });
}

export function parseArtistCell(value: string): string[] {
  return normalizeArtists(value.split(/[;\r\n]+/));
}

export function getArtistDisplay(song: SongArtistData): string {
  if (song.artistDisplay?.trim()) return song.artistDisplay;

  const artists = normalizeArtists(song.artists ?? [])
    .filter(artist => artist.toLowerCase() !== 'osad');
  if (artists.length === 0) return 'OSAD';

  const displayedArtists = artists.slice(0, 3);
  const remainingCount = artists.length - displayedArtists.length;
  return `OSAD x ${displayedArtists.join(' x ')}${remainingCount > 0 ? ` +${remainingCount}` : ''}`;
}

export function getListArtistDisplay(artists: string[] = []): string {
  const normalizedArtists = normalizeArtists(artists);
  if (!normalizedArtists.some(artist => artist.toLowerCase() === 'osad')) {
    normalizedArtists.unshift('OSAD');
  }
  return normalizedArtists.join(', ');
}

export function getArtistChips(artists: string[] = []): string[] {
  return normalizeArtists(artists).sort((first, second) => {
    if (first.toLowerCase() === 'osad') return second.toLowerCase() === 'osad' ? 0 : -1;
    if (second.toLowerCase() === 'osad') return 1;
    return 0;
  });
}
