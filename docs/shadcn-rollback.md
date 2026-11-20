# Shadcn redesign baseline

Recorded before the redesign on 2026-11-20.

- CMS Git baseline: `fe3a23a99ea81a1ec5429b061f58fc305236d7cc`
- Local CMS Git tag: `pre-shadcn-admin-2026-11-20`
- CMS production image at baseline: `ghcr.io/optidigi/optidigi-cms@sha256:7ec70203d3540cfd111ae3caba7037e2e56ff57b38f5b0780ceed9ab9c020080`
- Optidigi website baseline: `ada80a6` on `main`

The CMS review branch is `feature/shadcn-admin` and mounts Studio at `/studio`. The Optidigi website review branch is `feature/studio-localized-preview`. Use both branches to review the signed Dutch and English homepage previews. These changes require no database migration. Payload's existing admin and built-in MCP consent continue to run on the CMS branch.

The deployed CMS can be restored to the baseline digest using the [Compose release steps](../deploy/README.md). After a website release, rolling back the Astro deployment separately restores its previous preview and public renderer. Rolling back either application leaves editorial data in Postgres.

## Review locally

Run the CMS with `npm run dev` and a migrated development database. Development uses webpack after a reload loop was observed with Turbopack. Set `PREVIEW_SIGNING_KEY_FILE` for signed previews and `ASSISTANT_KEY_FILE` for model credential storage. Run the Optidigi website with `OPTIDIGI_CMS_ORIGIN` pointed to the CMS, and configure the test tenant's site origin to match the website. The development fixture should use tenant slug `optidigi` for the Astro pilot.
