import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, '日期無效');

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    series: z.enum(['etherfi']),
    seriesOrder: z.number().int().positive(),
    author: z.string().default('Larry'),
    publishedAt: isoDate,
    updatedAt: isoDate,
    checkedAt: isoDate,
    status: z.enum(['draft', 'published']),
    audience: z.array(z.string()).min(1),
    prerequisites: z.array(z.string()),
    sources: z.array(z.object({ title: z.string(), url: z.url() })).min(1),
    recommendationIds: z.array(z.string()).default([]),
    introFor: z.array(z.string()).default([]),
  }),
});

export const collections = { articles };
