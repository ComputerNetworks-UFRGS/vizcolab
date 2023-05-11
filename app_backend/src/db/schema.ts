import { jsonb, pgTable, serial } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

const UniversityNodeSchema = z
    .object({
        uf: z.string(),
        full_name: z.string(),
        city: z.string(),
        prod_count: z.number(),
        name: z.string(),
        legal_status: z.string(),
        id: z.string(),
        region: z.string(),
        color: z.string(),
        index: z.number(),
        x: z.number(),
        y: z.number(),
        z: z.number(),
        vx: z.number(),
        vy: z.number(),
        vz: z.number(),
    })
    .partial();

const LinkSchema = z.object({
    source: z.string(),
    target: z.string(),
    collabs_count: z.number(),
});

export const graphStates = pgTable('graph_states', {
    id: serial('id').primaryKey(),
    state: jsonb('state'),
});

export const graphStateInsertSchema = createInsertSchema(graphStates, {
    state: z.object({
        cameraPosition: z.object({
            x: z.number(),
            y: z.number(),
            z: z.number(),
        }),
        graphData: z.object({
            nodes: z.array(UniversityNodeSchema),
            links: z.array(LinkSchema),
        }),
        graphLevel: z.enum(['universities', 'programs', 'authors']),
        connectionDensity: z.number().min(1).max(7),
    }),
});
