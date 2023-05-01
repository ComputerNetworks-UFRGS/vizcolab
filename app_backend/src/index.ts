import cors from 'cors';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import express from 'express';
import morgan from 'morgan';
import { Pool } from 'pg';
import { graphStateInsertSchema, graphStates } from './db/schema';

dotenv.config();

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('tiny'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { logger: true });

app.post('/state', async (req, res) => {
    const state = graphStateInsertSchema.parse({ state: req.body });

    const ids = await db
        .insert(graphStates)
        .values(state)
        .returning({ id: graphStates.id })
        .execute();

    res.send(ids[0]);
});

app.get('/state/:id', async (req, res) => {
    const id = Number(req.params.id);

    const state = await db
        .select()
        .from(graphStates)
        .where(eq(graphStates.id, id))
        .execute();

    //@ts-ignore
    console.log(state[0]?.state?.graphData?.links[0]);

    res.send(state[0]);
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Vizcolab Backend listening on port ${port}`);
});
