# shaderBOT Server

![GitHub](https://img.shields.io/badge/license-Apache-%2391BF0A?style=flat-square)
[![Discord](https://img.shields.io/discord/237199950235041794?label=shaderLABS&logo=discord&color=7289da&style=flat-square)](https://discord.gg/RpzWN9S)

The following information is for developers and contributors. If you're a user, please go to [the wiki](https://github.com/shaderLABS/shaderBOT-server/wiki) instead.

## Install Dependencies

```properties
npm install
```

## Configuration (required)

### Discord Application

You must enable the "Server Members Intent" and "Message Content Intent" switches in the "Bot" tab of your [Discord application](https://discord.com/developers/applications) in order for some features to work.

### Bot Settings

The file `src/bot/settings/settings.json` contains information specific to the bot (e.g. the ID of the guild) and should match the setup on your server. The content should not include any sensitive information, since it may be publicly displayed while configuring the bot through commands (depending on where you run it). \
**Important**: The comments only exist for documentation purposes, they must be removed because the used parser does not support them.

```jsonc
{
    "logging": {
        "moderationChannelID": "",
        "messageChannelID": ""
    },
    "moderatorRoleID": "", // moderator role, e.g. mentioned in ban appeal threads
    "threadRoleID": "", // role that will be automatically added to new threads
    "stickyThreadChannelIDs": [""], // channels whose threads will be automatically sticky upon creation
    "appealChannelID": "", // channel for listing ban appeals
    "appealCooldown": 0, // cooldown in seconds for submitting new appeals after the previous one has been declined
    "botChannelID": "", // channel for sending failed auto responses, editing tickets and managing project subscriptions
    "mediaChannelIDs": [""], // channels in which every message that doesn't contain an image, a video or a link will be deleted
    "guildID": "",
    "archive": {
        "categoryIDs": [""], // categories which are used for archiving projects
        "minimumMessageCount": 0, // a project will be eligible for archiving if less than minimumMessageCount (must be between 1 and 100) messages...
        "maximumMessageAge": 0 // ...were sent in maximumMessageAge seconds
    },
    "warnings": {
        "decay": [0, 0, 0], // days, severity 1-3
        "punishment": {
            "muteRange": [0, 0], // min - max threshold
            "muteValues": [0, 0], // min - max values in seconds
            "tempbanRange": [0, 0], // min - max threshold
            "tempbanValues": [0, 0], // min - max values in seconds
            "ban": 0 // min threshold
        }
    },
    "blacklist": {
        "strings": [""], // any message containing these links will be deleted and the author will be muted
        "muteDuration": 900 // duration of the mute in seconds
    },
    "spamProtection": {
        "cacheLength": 0, // length of the spam protection cache
        "characterThreshold": 0, // minimum characters after which messages will be checked for spam
        "muteDuration": 0, // duration of the mute in seconds
        "messageThreshold": 0, // number of similar messages after which the spam protection will be triggered
        "timeThreshold": 0, // maximum delay between similar messages in seconds (after which they won't be counted)
        "similarityThreshold": 0 // threshold that determines how similar messages must be in order to get flagged as spam (between 0 and 1)
    },
    "raidProtection": {
        "cacheLength": 0, // length of the raid protection cache
        "creationTimeThreshold": 0, // maximum time between the creation of accounts in seconds (if less, then accounts will be flagged)
        "usernameSimilarityThreshold": 0, // threshold that determines how similar usernames must be in order to get flagged as bots (between 0 and 1)
        "userThreshold": 0 // number of similar users after which the raid protection will be triggered
    }
}
```

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
