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

# Using module via GitHub NPM Registry

In the repo that will use this module, create an `.npmrc` with the following:

    registry=https://npm.pkg.github.com/shah

Add the module to your `package.json` and then:

    npm install

# Publishing to GitHub NPM Registry

Update the version information, at least once in your local repo make sure that you've logged into to NPM registry:

    npm login --registry=https://npm.pkg.github.com

When asked, give your GitHub ID, password is your GitHub Personal Access Token (PAT) in `$HOME/.engrsb/.secrets.env`, and email.

Then:

    npm publish
