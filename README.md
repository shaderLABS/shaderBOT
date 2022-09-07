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

| Name                        |    Default    | Description                                                                                                                                          |
| --------------------------- | :-----------: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TOKEN`                     |     NONE      | The token which you can find under the "Bot" tab of your [Discord application](https://discord.com/developers/applications).                         |
| `APPLICATION_CLIENT_ID`     |     NONE      | The client ID which you can find under the "General Information" tab of your [Discord application](https://discord.com/developers/applications).     |
| `APPLICATION_CLIENT_SECRET` |     NONE      | The client secret which you can find under the "General Information" tab of your [Discord application](https://discord.com/developers/applications). |
| `BACKUP_ENCRYPTION_KEY`     |     NONE      | The key used for encrypting and decrypting channel backups. It must be 256 bits (32 characters) long.                                                |
| `SESSION_SECRET`            |     NONE      | The secret key used for signing session cookies. It is required if `BOT_ONLY` is not set to `true`.                                                  |
| `NODE_ENV`                  | `development` | The environment this is being run in. Can be either `development` or `production` and should always be set accordingly.                              |
| `PORT`                      |    `3001`     | The port that the REST API will run on.                                                                                                              |
| `DOMAIN`                    |  `localhost`  | The domain that the REST API will run on.                                                                                                            |
| `BOT_ONLY`                  |    `false`    | Run the server in bot-only mode, which disables the Polka server (REST API).                                                                         |
| `PG_USER`                   |  `postgres`   | The name used for accessing the PostgreSQL database.                                                                                                 |
| `PG_PASSWORD`               |  `postgres`   | The password used for accessing the PostgreSQL database.                                                                                             |
| `PG_HOST`                   |  `localhost`  | The hostname used for connecting to the PostgreSQL server.                                                                                           |
| `PG_PORT`                   |    `5432`     | The port which the PostgreSQL server is running on.                                                                                                  |
| `PG_DATABASE`               |  `shaderBOT`  | The name of the PostgreSQL database which is **already populated** using the [`init.sql`](src/db/init.sql) file.                                     |

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
