import express from 'express';
import path from 'path';
import helmet from 'helmet';
import passport from 'passport';
import routes from './routes/main.js';
import session from 'express-session';
import store from 'connect-pg-simple';
import './strategies/discord.js';
import { db } from '../db/postgres.js';

const pg_store = store(session);

const port = process.env.PORT || 3001;
const dirname = path.resolve();
const app = express();

app.use(helmet());
app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'SECRET',
        cookie: { maxAge: 60000 * 60 * 24 },
        resave: false,
        saveUninitialized: false,
        store: new pg_store({ pool: db }),
    })
);
app.use(passport.initialize());
app.use(passport.session());

app.use('/api', routes);

app.get('/', (req, res) => {
    res.send('Hello World');
});

export function startWebserver() {
    app.listen(port, () => console.log(`Started web server on port ${port}.`));
}
