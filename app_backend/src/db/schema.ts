import { jsonb, pgTable, serial } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

const NodeSchema = z.object({
    prod_count: z.number(),
    id: z.string(),
    color: z.string(),
    index: z.number(),
    x: z.number(),
    y: z.number(),
    z: z.number(),
    vx: z.number(),
    vy: z.number(),
    vz: z.number(),
});

const LinkSchema = z.object({
    source: z.string(),
    target: z.string(),
    collabs_count: z.number(),
});

const UniversityNodeSchema = NodeSchema.extend({
    uf: z.string(),
    full_name: z.string(),
    city: z.string(),
    name: z.string(),
    legal_status: z.string(),
    region: z.string(),
})
    .partial()
    .passthrough();

const ProgramNodeSchema = NodeSchema.extend({
    name: z.string(),
    full_name: z.string(),
    knowledge_area: z.string(),
    knowledge_subarea: z.string(),
    rating_area: z.string(),
    specialty: z.string(),
    university: z.string(),
    wide_knowledge_area: z.string(),
})
    .partial()
    .passthrough();

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
            nodes: z.union([
                z.array(UniversityNodeSchema),
                z.array(ProgramNodeSchema),
            ]),
            links: z.array(LinkSchema),
        }),
        graphLevel: z.enum(['universities', 'programs', 'authors']),
        connectionDensity: z.number().min(1).max(7),
    }),
});
