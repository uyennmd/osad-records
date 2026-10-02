export type PlatformConfig = {
  icon: string;
  color: string;
  wordmark?: boolean;
};

const defaultConfig: PlatformConfig = {
  icon: 'https://cdn.simpleicons.org/music/ea580c',
  color: '#EA580C',
};

export const platformConfigs: Record<string, PlatformConfig> = {
  spotify: {
    icon: 'https://cdn.simpleicons.org/spotify/1db954',
    color: '#1DB954',
  },
  'apple music': {
    icon: 'https://cdn.simpleicons.org/applemusic/fb4d2d',
    color: '#FB4D2D',
  },
  youtube: {
    icon: 'https://cdn.simpleicons.org/youtube/ff0000',
    color: '#FF0000',
  },
  'youtube music': {
    icon: 'https://cdn.simpleicons.org/youtubemusic/ff0000',
    color: '#FF0000',
  },
  'amazon music': {
    icon: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Amazon_Music.svg',
    color: '#25D1DA',
    wordmark: true,
  },
  tidal: {
    icon: 'https://cdn.simpleicons.org/tidal/000000',
    color: '#000000',
  },
  deezer: {
    icon: 'https://cdn.simpleicons.org/deezer/a238ff',
    color: '#A238FF',
  },
};

export function getPlatformConfig(platform: string): PlatformConfig {
  const key = platform.trim().toLowerCase();
  return platformConfigs[key] ?? defaultConfig;
}
