# Read typed Gmail messages

NodeJS module that reads an oAuth-authenticated GMail mailbox and calls functions with typed messages.

# Secrets files

This project uses Google's APIs and requires the following:

* `.secrets/api-access.json` (required for the package to function, get from [Google APIs Console](https://console.developers.google.com/))
* `.secrets/stored-oauth-tokens.json` (will be created upon first use, if necessary)

# Developer Instructions

Clone this project into your own sandbox and use Visual Studio Code Remote Containers extension.

After opening the `.devcontainer` you can run the following in VS Code's Terminal window.

Use TypeScript directly:

    tsc --project tsconfig.json
    node dist/test.js

You can also run without compiling first:

    npm test

