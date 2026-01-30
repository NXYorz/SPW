import { z } from 'zod';

export const resourceUpsertSchema = z.object({
  title: z.string().min(1).max(120),
  category: z.string().min(1).max(50),
  type: z.string().min(1).max(20),
  url: z.string().url().max(400),
  summary: z.string().min(1).max(2000),
  tags: z.array(z.string().min(1).max(30)).max(8).default([]),
});
