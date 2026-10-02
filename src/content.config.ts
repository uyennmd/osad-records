import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const songs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/songs' }),
  schema: z.object({
    title: z.string(),
    releaseDate: z.coerce.date(),
    album: z.string().optional(),
    cover: z.string().optional(),
    links: z.array(z.object({ platform: z.string(), url: z.string().url() })).default([]),
    credits: z.array(z.object({ role: z.string(), name: z.string() })).default([]),
    lyrics: z.string().optional(),
    lyricsUrl: z.string().url().optional(), // khuyên dùng link thay vì đăng lời (bản quyền)
  }),
});

export const collections = { songs };
