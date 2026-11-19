# Deploy Optidigi CMS

GitHub Actions tests and builds the standalone Next.js image, starts it against a fresh database, then publishes passing main revisions to `ghcr.io/optidigi/optidigi-cms`. Set the GHCR package visibility to **Public** after the first publish so production can pull it anonymously. Each image has a commit tag and the newest release also has the `latest` tag.

## Prepare the host

Place [compose.yaml](compose.yaml) in `/srv/prod/infra/stacks/optidigi-cms` on `prod`. The Compose stack joins the existing Traefik `proxy` network, routes `cms.optidigi.nl` over `websecure`, and admits Cloudflare source IP ranges. Keep those ranges aligned with [Cloudflare’s published list](https://www.cloudflare.com/ips/). The Cloudflare DNS record should be proxied and its TLS mode should validate Traefik’s origin certificate. The CMS uses an internal network for Postgres and named volumes for database files and uploads.

Run the following once from the stack directory as `serveradmin`, whose UID 1000 matches the app container user. Keep these files on the host. The password uses hex so it is safe to interpolate into the Postgres URL.

```sh
umask 077
mkdir -p secrets
openssl rand -hex 32 > secrets/assistant_key
openssl rand -hex 32 > secrets/preview_signing_key
{
  printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'PAYLOAD_SECRET=%s\n' "$(openssl rand -hex 32)"
} > .env
```

## Pull and pin a release

Pull the image before the cutover and record its digest. Start using the digest so migration and app startup use the same release even if `latest` moves. On an update, keep the previous digest for rollback and coordinate a maintenance window if the migration needs one.

```sh
CMS_IMAGE=ghcr.io/optidigi/optidigi-cms:latest docker compose pull
docker image inspect ghcr.io/optidigi/optidigi-cms:latest --format '{{index .RepoDigests 0}}'
export CMS_IMAGE='ghcr.io/optidigi/optidigi-cms@sha256:<recorded-digest>'
```

## Create the first operator

On the first deployment, start Postgres and create the operator before starting the app behind Traefik. Use your operator email and enter a password from your password manager when prompted.

```sh
docker compose up -d --no-build --wait postgres
export OPS_BOOTSTRAP_EMAIL='operator@example.com'
password_file="$(mktemp "$PWD/secrets/operator_password.XXXXXXXX")"
read -r -s -p 'Initial operator password: ' operator_password
printf '\n'
printf '%s\n' "$operator_password" > "$password_file"
unset operator_password
docker compose run --rm --no-deps --label traefik.enable=false \
  --env OPS_BOOTSTRAP_EMAIL --env OPS_BOOTSTRAP_PASSWORD_FILE=/run/secrets/operator_password \
  --volume "$password_file:/run/secrets/operator_password:ro" \
  --entrypoint sh app -ec 'node node_modules/payload/bin.js migrate && node node_modules/payload/bin.js bootstrap-operator'
rm -f "$password_file"
unset OPS_BOOTSTRAP_EMAIL
```

## Start and verify

```sh
docker compose up -d --no-build --wait --wait-timeout 180
docker compose ps
curl --fail --silent --show-error https://cms.optidigi.nl/api/health
```

The app runs `payload migrate` from the release image before starting Next.js. A failed migration prevents the server from starting. Check `docker compose logs app postgres` if readiness fails. Roll back by setting `CMS_IMAGE` to the previous digest and recreating the app only when the migrated schema remains compatible.

Verify that the assistant streams through Cloudflare, signed-out visitors cannot open it, and the Optidigi pilot keeps drafts private while publishing updates without a site redeploy. Keep the assistant route free of Traefik buffering and shared caching. Off-host backup setup is deferred to the VPS refactor.
