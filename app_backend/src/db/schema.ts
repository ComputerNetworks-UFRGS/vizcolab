import { jsonb, pgTable, serial } from 'drizzle-orm/pg-core';

export const graphStates = pgTable('graph_states', {
    id: serial('id').primaryKey(),
    state: jsonb('state'),
});
