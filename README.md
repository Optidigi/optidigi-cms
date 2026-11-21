# Optidigi CMS

A shared headless CMS for independently deployed sites. The shadcn admin at `/admin` uses Payload's own REST and Local APIs. Payload's MCP plugin renders its OAuth consent page. Websites read published content through Payload's standard REST API and render it on their own domains. See [the admin replacement plan](tasks/admin-replacement-plan.md).

## Local development

Use the Node version from [.nvmrc](.nvmrc), then start the development Postgres database and install dependencies.

```sh
nvm use
docker compose up -d --wait postgres
npm ci
```

On first setup, copy `.env.example` to `.env` and set `PAYLOAD_SECRET` to a random secret. The sample URL matches the development Postgres service. Apply the committed migrations.

```sh
npm run payload -- migrate
```

Create the first operator before starting the app. Put a password of at least 20 characters in a local file with restricted permissions and set its path below.

```sh
OPS_BOOTSTRAP_EMAIL=operator@example.com \
OPS_BOOTSTRAP_PASSWORD_FILE=/absolute/path/to/local/password-file \
npm run payload -- bootstrap-operator
npm run dev
```

Open [the local admin](http://localhost:3000/admin). To try draft preview, generate a 32-byte hex key with `openssl rand -hex 32`, store it in a local file and set `PREVIEW_SIGNING_KEY_FILE` in `.env`. Set the `SMTP_*` variables to send password-reset email; without them Payload writes email to the console.

Run `npm run lint`, `npx tsc --noEmit`, `npm run test:int`, and `npm run test:e2e` to check the app against the migrated local database.

See [production deployment](deploy/README.md) for the published image, first operator setup, and the release procedure.
