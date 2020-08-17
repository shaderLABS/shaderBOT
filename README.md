# shaderBOT Server

## Contribution
In order to contribute to this project, clone the repository, navigate to the folder and run:
```
npm install --save-dev
```

Next, create a file called `.env` in the root directory containing the following environment variables:
```
TOKEN=
PORT=
MONGODB=
```
- TOKEN is the discord bot token which you can get by creating a bot application at https://discord.com/developers/applications.
- PORT is the port the server will run on. If not specified, the server will run on port 3001.
- MONGODB is the address used for connecting to MongoDB. If not specified, the application will try to connect using `mongodb://127.0.0.1/shaderBOT`. This assumes that you have a MongoDB server hosted on your computer.

After that, configure `cfg.json`. Especially IDs should be updated to match the setup on your development server.

To start the project, run:
```
npm run dev
```
This will transpile the typescript files and run the Node.js server.

If you're using VS Code, adding the following options to your `settings.json` is highly recommended:
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
