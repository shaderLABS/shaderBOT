import { client, startBot } from './bot/bot.js';
import { connectPostgreSQL, db } from './db/postgres.js';
import { startWebserver } from './web/server.js';

export function shutdown(code: number = 0) {
    console.log('Shutting down...');
    db.end().catch(() => undefined);
    client.destroy();
    process.exit(code);
}

await connectPostgreSQL();

startBot();
startWebserver();
