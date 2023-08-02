import cors from 'cors';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import express from 'express';
import morgan from 'morgan';
import { Pool } from 'pg';
import { graphStates } from './db/schema';

dotenv.config();

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('tiny'));

console.log('Using this DATABASE_URL: ', process.env.DATABASE_URL);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// log when a new client is created and connected
pool.on('connect', (client) => {
    console.log('Connected to the database');
});

// log errors
pool.on('error', (err, client) => {
    console.error('Unexpected database client error', err);
});

const db = drizzle(pool, { logger: true });

app.post('/state', async (req, res) => {
    console.log('Received request to save a state');
    const state = { state: req.body };

    const ids = await db
        .insert(graphStates)
        .values(state)
        .returning({ id: graphStates.id })
        .execute();

    console.log(`Saved state with id ${ids[0]}`);

    res.send(ids[0]);
});

app.get('/state/:id', async (req, res) => {
    console.log('Received request to get a state');
    const id = Number(req.params.id);

    const state = await db
        .select()
        .from(graphStates)
        .where(eq(graphStates.id, id))
        .execute();

    if (state[0]) {
        console.log(`Found state with id ${id}, returning it`);
    }
    res.send(state[0]);
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Vizcolab Backend listening on port ${port}`);
});
