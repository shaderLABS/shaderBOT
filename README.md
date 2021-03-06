# shaderBOT Server

![Libraries.io dependency status for GitHub repo](https://img.shields.io/librariesio/github/Shader-Labs/shaderBOT-server?style=flat-square)
![GitHub](https://img.shields.io/github/license/Shader-Labs/shaderBOT-server?style=flat-square)
[![Discord](https://img.shields.io/discord/237199950235041794?label=shaderLABS&logo=discord&color=7289da&style=flat-square)](https://discord.gg/RpzWN9S)

The following information is for developers and contributors. If you're a user, please go to [the wiki](https://github.com/shaderLABS/shaderBOT-server/wiki) instead.

## Install Dependencies

```properties
npm install
```

## Configuration (required)

### Discord Application

You must enable the "Server Members Intent" switch (below "Privileged Gateway Intents") under the "Bot" tab of your [Discord application](https://discord.com/developers/applications) in order for some features to work.

### Bot Settings

The file `src/bot/settings/settings.json` contains information specific to the bot (e.g. the ID of the guild) and should match the setup on your server. The content should not include any sensitive information, since it may be publicly displayed while configuring the bot through commands (depending on where you run it). \
**Important**: The comments only exist for documentation purposes, they must be removed because the used parser does not support them.

```jsonc
{
    "prefix": "",
    "logging": {
        "channelID": ""
    },
    "ticket": {
        "categoryIDs": [""],
        "managementChannelID": "",
        "subscriptionChannelID": "",
        "attachmentCacheChannelID": ""
    },
    "mediaChannelIDs": [""],
    "muteRoleID": "",
    "guildID": "",
    "warnings": {
        "decay": [0, 0, 0], // days, severity 1-3
        "punishment": {
            "muteRange": [0, 0], // min - max threshold
            "muteValues": [0, 0], // min - max values in seconds
            "tempbanRange": [0, 0], // min - max threshold
            "tempbanValues": [0, 0], // min - max values in seconds
            "ban": 0 // min threshold
        }
    }
}
```

### Environment Variables

Environment variables are read from `.env` and specifiy sensitive information like private keys that shouldn't ever be publicly visible.

| Name                        |   Default   | Description                                                                                                                                          |
| --------------------------- | :---------: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TOKEN`                     |    NONE     | The token which you can find under the "Bot" tab of your [Discord application](https://discord.com/developers/applications).                         |
| `APPLICATION_CLIENT_ID`     |    NONE     | The client ID which you can find under the "General Information" tab of your [Discord application](https://discord.com/developers/applications).     |
| `APPLICATION_CLIENT_SECRET` |    NONE     | The client secret which you can find under the "General Information" tab of your [Discord application](https://discord.com/developers/applications). |
| `SESSION_SECRET`            |  `SECRET`   | The secret key used for signing session cookies. You should NOT use the default value!                                                               |
| `PORT`                      |   `3001`    | The port that the web server will run on.                                                                                                            |
| `BOT_ONLY`                  |   `FALSE`   | Run the server in bot-only mode, which disables the Polka and Apollo/GraphQL server.                                                                 |
| `PG_USER`                   | `postgres`  | The name used for accessing the PostgreSQL database.                                                                                                 |
| `PG_PASSWORD`               | `postgres`  | The password used for accessing the PostgreSQL database.                                                                                             |
| `PG_HOST`                   | `localhost` | The hostname used for connecting to the PostgreSQL server.                                                                                           |
| `PG_PORT`                   |   `5432`    | The port which the PostgreSQL server is running on.                                                                                                  |
| `PG_DATABASE`               | `shaderBOT` | The name of the PostgreSQL database which is **already populated** using the [`init.sql`](src/db/init.sql) file.                                     |

## Running the Application

```properties
npm run dev
```

This will transpile the TypeScript files and run the server using [nodemon](https://www.npmjs.com/package/nodemon).

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
_Coded by [Niemand](https://github.com/Kneemund)_
