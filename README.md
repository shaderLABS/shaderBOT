# shaderBOT

![GitHub](https://img.shields.io/badge/license-Apache-%2391BF0A?style=flat-square)
[![Discord](https://img.shields.io/discord/237199950235041794?label=shaderLABS&logo=discord&color=7289da&style=flat-square)](https://discord.gg/RpzWN9S)

The following information is for developers and contributors. If you're a user, please go to [the wiki](https://github.com/shaderLABS/shaderBOT/wiki) instead.

## Install Dependencies

```properties
npm install
```

## Configuration (required)

### Discord Application

You must enable the "Server Members Intent" and "Message Content Intent" switches in the "Bot" tab of your [Discord application](https://discord.com/developers/applications) in order for some features to work.

### Settings

The file `customContent/settings.jsonc` contains information specific to the bot (e.g. the ID of the guild) and should match the setup on your server. Its content should not include any sensitive information, since it may be publicly displayed while configuring the bot.

There is a template configuration in [`settings.template.jsonc`](settings.template.jsonc), which contains the necessary structure and documents what each option does. Using this template, you must manually create and adjust `customContent/settings.jsonc` before starting shaderBOT. Once it is running, you can use commands to modify the configuration.

> **WARNING:** Most invalid options will crash shaderBOT or silently skip the desired action as soon as they are accessed! shaderBOT will check the types of all configuration values at startup, but it can not check their validity.

### Environment Variables

Environment variables are read from `.env` and specifiy sensitive information like private keys that shouldn't ever be publicly visible.

| Name                        |   Default    | Description                                                                                                                                          |
| --------------------------- | :----------: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TOKEN`                     |     NONE     | The token which you can find under the "Bot" tab of your [Discord application](https://discord.com/developers/applications).                         |
| `APPLICATION_CLIENT_ID`     |     NONE     | The client ID which you can find under the "General Information" tab of your [Discord application](https://discord.com/developers/applications).     |
| `APPLICATION_CLIENT_SECRET` |     NONE     | The client secret which you can find under the "General Information" tab of your [Discord application](https://discord.com/developers/applications). |
| `BACKUP_ENCRYPTION_KEY`     |     NONE     | The key used for encrypting and decrypting channel backups. It must be 256 bits (32 characters) long.                                                |
| `SESSION_SECRET`            |     NONE     | The secret key used for signing session cookies. It is required if `BOT_ONLY` is not set to `true`.                                                  |
| `NODE_ENV`                  | `production` | The environment this is being run in. Can be either `development` or `production` and should always be set accordingly.                              |
| `PORT`                      |    `3001`    | The port that the REST API will run on.                                                                                                              |
| `IPC_PATH`                  |     NONE     | The IPC path (e.g. UNIX domain socket) that the REST API will run on. Takes precedence over `PORT` if specified.                                     |
| `DOMAIN`                    | `localhost`  | The domain that the REST API will run on.                                                                                                            |
| `BOT_ONLY`                  |   `false`    | Run the server in bot-only mode, which disables the Polka server (REST API).                                                                         |
| `PG_USER`                   |  `postgres`  | The name used for accessing the PostgreSQL database.                                                                                                 |
| `PG_PASSWORD`               |  `postgres`  | The password used for accessing the PostgreSQL database.                                                                                             |
| `PG_HOST`                   | `localhost`  | The hostname used for connecting to the PostgreSQL server.                                                                                           |
| `PG_PORT`                   |    `5432`    | The port which the PostgreSQL server is running on.                                                                                                  |
| `PG_DATABASE`               | `shaderBOT`  | The name of the PostgreSQL database which is **already populated** using the [`init.sql`](src/db/init.sql) file.                                     |

## Unix Domain Sockets

For using Unix domain sockets, set the `IPC_PATH` environment variable to e.g. `/run/shaderbot/rest-api.sock`. Before running the application, create the parent directory (`/run/shaderbot`) and set it up with appropriate permissions. The socket file has read and write permissions for the owner and group, i.e. only processes by the same user or in the same group can bind to it.

If the API runs through a reverse proxy, e.g. NGINX which is in the `www-data` group, change the group accordingly.

```sh
chgrp www-data /run/shaderbot
```

Then, add read and execute permissions to the group, and set the `setgid` flag (`s`). This causes any newly created files to inherit the group of the parent directory, `www-data`, which means that NGINX can bind to the socket.

```sh
chmod g+rxs /run/shaderbot
```

## Running the Application

### npm (development)

```properties
npm run dev
```

This will transpile the TypeScript files, run the server and watch for changes.
You can also manually transpile the TypeScript files with `npm run build` and then run the server using `npm run start`.

### PM2 (production)

```properties
npm run build
pm2 start ecosystem.config.cjs
```

This will daemonize and run the server with [PM2](https://pm2.keymetrics.io/) using the [`ecosystem.config.cjs`](ecosystem.config.cjs) configuration file.

### Docker (production)

Move the files in `/scripts/prod/docker/` to the root folder of this project. After configuring the `Dockerfile`, you can create and start the container using `docker-compose`:

```properties
docker-compose up
```

**IMPORTANT:** The Docker configuration is mostly untested, so you should expect issues when using it.

### Uploading Command Structure

You must upload the command structure to Discord in order to be able to view and use commands. You can do that by running the following command after building the application:

```properties
npm run update
```

## Updating the Application

In order to update the application to the newest version, pull the latest changes from GitHub. After rebuilding the source code, you must restart the application for the changes to take effect.

Be aware that new settings could have been added to the configuration file. The console output will inform you about any missing keys and the application will only start after they have been added.

Additionally, [re-uploading the command structure](#Uploading-Command-Structure) may be neccessary if it has changed.

### Applying Migrations

After certain updates, the database tables and other dynamic content might have to be migrated before starting the application. If new migrations are available, you can see them in the console output while pulling from GitHub. You can apply all migrations that have not been applied so far by running the following command after building the application:

```properties
npm run migrate
```

## Recommended Visual Studio Code Settings and Extensions

### Settings

Adding the following options to your VS Code configuration file is highly recommended:

```json
"files.exclude": {
    "**/.git": true,
    "**/.svn": true,
    "**/.hg": true,
    "**/CVS": true,
    "**/.DS_Store": true,

    "**/*.js": { "when": "$(basename).ts" },
    "**/*.js.map": true
},
"[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.organizeImports": true
    }
},
```

This will hide the transpiled JavaScript files if there are corresponding TypeScript files and automatically format when saving.

### Extensions

-   [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) - Used for auto-formatting to improve consistency. It will use the existing configuration file ([`.prettierrc`](.prettierrc)).
-   [SQL tagged template literals (syntax only)](https://marketplace.visualstudio.com/items?itemName=frigus02.vscode-sql-tagged-template-literals-syntax-only) - SQL syntax highlighting.

\
_Made by [Kneemund](https://github.com/Kneemund)_
