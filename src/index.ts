import { startWebserver } from './web/server.js';
import { startBot } from './bot/bot.js';
import mongoose from 'mongoose';

export function shutdown() {
    console.log('Shutting down...');

    mongoose.connection.close();
    process.exit();
}

process.on('SIGINT', shutdown);

startWebserver();
startBot();
