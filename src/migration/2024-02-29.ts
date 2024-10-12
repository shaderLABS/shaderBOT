import { connectPostgreSQL, db } from './shared.ts';

// Removes the table called 'session' from the database.
console.group();

await connectPostgreSQL();
await db.query(/*sql*/ `DROP TABLE "session";`);

console.log("Successfully deleted 'session' table.");

process.exit();
