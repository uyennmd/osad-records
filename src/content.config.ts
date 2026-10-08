import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import eventsData from './data/events.json';
import journeyData from './data/journey.json';
import { normalizeArtists } from './lib/artists';
import {
  getGoogleSheetsId,
  googleSheetsEventsLoader,
  googleSheetsJourneyLoader,
  googleSheetsSongsLoader,
  staticDataLoader,
} from './lib/sheet';

const sheetsId = getGoogleSheetsId();

const songs = defineCollection({
  loader: sheetsId
    ? googleSheetsSongsLoader(sheetsId)
    : glob({ pattern: '**/*.md', base: './src/content/songs' }),
  schema: z.object({
    title: z.string(),
    releaseDate: z.coerce.date(),
    album: z.string().optional(),
    cover: z.string().optional(),
    links: z.array(z.object({ platform: z.string(), url: z.string().url() })).default([]),
    credits: z.array(z.object({ role: z.string(), name: z.string() })).default([]),
    lyrics: z.string().optional(),
    notes: z.string().optional(),
    lyricsUrl: z.string().url().optional(), // khuyên dùng link thay vì đăng lời (bản quyền)
    type: z.enum(['solo', 'collab', 'featured', 'other']).optional(),
    artistDisplay: z.string().optional(),
    artists: z.array(z.string()).default([]).transform(normalizeArtists),
  }),
});

const journey = defineCollection({
  loader: sheetsId
    ? googleSheetsJourneyLoader(sheetsId)
    : staticDataLoader('journey', journeyData, item => String(item.slug)),
  schema: z.object({
    slug: z.string().optional(),
    title: z.string(),
    date: z.string(),
    type: z.enum(['interview', 'event', 'performance', 'other']),
    url: z.string().optional(),
    source: z.string().optional(),
    thumbnail: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const events = defineCollection({
  loader: sheetsId
    ? googleSheetsEventsLoader(sheetsId)
    : staticDataLoader('events', eventsData, (_item, index) => `event-${index + 1}`),
  schema: z.object({
    date: z.string(),
    title: z.string(),
    place: z.string().optional(),
    link: z.string().optional(),
  }),
});

export const collections = { songs, journey, events };
