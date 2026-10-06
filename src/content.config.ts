import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { getGoogleSheetsConfig, googleSheetsLoader } from './lib/sheet';

const sheetsConfig = getGoogleSheetsConfig();

const songs = defineCollection({
  loader: sheetsConfig
    ? googleSheetsLoader(sheetsConfig)
    : glob({ pattern: '**/*.md', base: './src/content/songs' }),
  schema: z.object({
    title: z.string(),
    releaseDate: z.coerce.date(),
    album: z.string().optional(),
    cover: z.string().optional(),
    links: z.array(z.object({ platform: z.string(), url: z.string().url() })).default([]),
    credits: z.array(z.object({ role: z.string(), name: z.string() })).default([]),
    lyrics: z.string().optional(),
    lyricsUrl: z.string().url().optional(), // khuyên dùng link thay vì đăng lời (bản quyền)
    notes: z.string().optional(),
    type: z.enum(['solo', 'guest', 'featured', 'collab', 'other']).optional(),
    mainArtist: z.string().optional(),
    partner_1: z.string().optional(),
    partner_2: z.string().optional(),
    partner_3: z.string().optional(),
  }),
});

export const collections = { songs };
