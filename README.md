# Optidigi CMS

A shared headless CMS for independently deployed sites. The Payload admin and assistant run in this Next.js application. The public sites render published content on their own domains.

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

Open [the local admin](http://localhost:3000/admin). To try assistant credential storage or draft preview, generate a separate 32-byte hex key for each feature with `openssl rand -hex 32`. Store the keys in separate local files and set their paths in `.env`.

Run `npm run lint`, `npx tsc --noEmit`, and `npm run test:int` to check the app against the migrated local database.

See [production deployment](deploy/README.md) for the published image, first operator setup, and the release procedure.
