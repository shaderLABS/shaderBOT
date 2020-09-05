# shaderBOT Server

## Install Packages

```
npm install --save-dev
```

## Configuration

Create a file called `.env` in the root directory containing the following environment variables:

```
TOKEN=
APPLICATION_CLIENT_ID=
APPLICATION_CLIENT_SECRET=
SESSION_SECRET=
PORT=

PG_USER=
PG_PASSWORD=
PG_HOST=
PG_PORT=
PG_DATABASE=
```

-   `TOKEN` is the discord bot token which you can find under the "Bot" tab of your [bot application](https://discord.com/developers/applications).
-   `APPLICATION_CLIENT_ID` is the discord application client id which you can find under the "General Information" tab of your [bot application](https://discord.com/developers/applications).
-   `APPLICATION_CLIENT_SECRET` is the discord application client secret which you can find under the "General Information" tab of your [bot application](https://discord.com/developers/applications).
-   `SESSION_SECRET` is any random string for encrypting cookies used for storing sessions.
-   `PORT` is the port the server will run on. If not specified, the server will run on port 3001.

`PG_USER` (DEFAULT: postgres), `PG_PASSWORD` (DEFAULT: postgres), `PG_HOST` (DEFAULT: localhost), `PG_PORT` (DEFAULT: 5432) and `PG_DATABASE` (DEFAULT: shaderBOT) are the variables used for connecting to the PostgreSQL server.

After that, configure `cfg.json`. Especially IDs should be updated to match the setup on your development server.

In order to (re-)create all of the needed tables, run the queries in `/src/db/init.sql`.

## Running the Application

To start the project, run:

```
npm run dev
```

This will transpile the typescript files and run the Node.js server.

## Recommended VSCode Settings and Extensions

### Settings

Adding the following options to your `settings.json` is highly recommended:

```
    "files.exclude": {
        "**/.git": true,
        "**/.svn": true,
        "**/.hg": true,
        "**/CVS": true,
        "**/.DS_Store": true,

        "**/*.js": { "when": "$(basename).ts" },
        "**/*.js.map": true
    }
```

This will hide the transpiled javascript files if there are corresponding typescript files.

### Extensions

-   [SQL tagged template literals (syntax only)](https://marketplace.visualstudio.com/items?itemName=frigus02.vscode-sql-tagged-template-literals-syntax-only) - SQL Syntax Hightlighting inside of TypeScript
