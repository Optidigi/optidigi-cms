# How the CMS works

One Payload CMS serves several independently deployed websites. Each website is a *tenant*. Editors use the admin at `/admin`; websites read published content through Payload's REST API and render it on their own domains.

Keep this page current: a change that alters behaviour, a rule or a custom piece updates this page in the same PR.

## Ground rules

- **Payload does the work.** The admin talks to Payload's own REST API in the browser and the Local API in server components (with `overrideAccess: false` and the signed-in user). Auth, drafts, versions, locking, uploads, localisation and preferences are Payload's built-in features. No custom rule is added without discussing it first; the custom pieces below are the complete list. GraphQL is switched off (`graphQL.disable`); everything uses REST.
- **Official shadcn only.** UI comes from official shadcn components (style `base-vega`, Base UI) and AI Elements, composed in app code. Files in `src/components/ui` stay exactly as the shadcn CLI generates them; `scripts/verify-ui.mjs` checks their hashes in CI. Look and feel change only through theme tokens in `src/app/(cms)/admin.css`. Any library outside what shadcn itself installs needs the owner's review.
- **Secrets stay on the server.** AI keys and the website refresh secret are encrypted with `payload.encrypt`, and their field access never returns them.
- **Websites stay apart.** The multi-tenant plugin scopes every read and write to the user's websites. The AI is limited to the one website its chat belongs to.
- **Exact versions.** Every dependency is pinned to an exact version, so each update is a visible change. Payload is on a 4.0 beta; all `payload` and `@payloadcms/*` packages share one version and are upgraded together, on purpose. npm reports conflicting peer versions (there is no `legacy-peer-deps`).

## Where things live

| Path | What |
| --- | --- |
| `src/payload.config.ts` | Payload config: collections, global, plugins, email, editor |
| `src/site/` | Websites and content: collections, access rules, preview, refresh hook, slug rule |
| `src/collections/` | Users and media |
| `src/assistant/` | AI: connections, chat endpoint, website scope |
| `src/app/(cms)/admin/` | Admin routes (Next.js app router) |
| `src/cms/` | Admin UI code (shell, editor, settings, AI chat, i18n) |
| `src/components/ui/` | Generated shadcn components (do not edit) |
| `src/migrations/` | Database migrations, run at container start |
| `tests/int`, `tests/e2e` | Integration tests (Vitest) and journeys (Playwright) |

## Content and access

| Collection | Who reads | Who writes | Notes |
| --- | --- | --- | --- |
| `tenants` (websites) | Anyone reads the slug; members read the rest | Platform admins | Never deleted. `siteOrigin` must be an HTTPS origin. |
| `pages`, `articles`, `projects` | Anyone reads published; members read drafts | Members; deleting needs website admin | Drafts with autosave. Slug unique per website. Articles and portfolio are switched on per website (`sections`). |
| `site-settings` | Anyone reads published | Members | One per website. Name, contact, logos (light, dark, square icon), navigation, SEO. |
| `media` | Anyone | Members; deleting needs website admin | Images and SVG logos. Payload rejects SVGs with scripts or event handlers. |
| `users` | Platform admins; others read themselves | Platform admins; others update themselves | Roles: `customer` or `platform-admin`, plus a role per website (`admin`, `editor`). |
| `assistant-settings` | Members (never the key or address) | Platform admins | AI connections per website. |
| `assistant-threads`, `assistant-files` | The author only | The author | Chat history and chat uploads. |
| `platform` (global) | Platform admins | Platform admins | Which website's logo is the CMS brand on the sign-in screen. |

Users, websites, media, the platform global and the AI collections keep **no version history** (`versions: false`): Payload 4 turns history on by default, and it would copy password hashes and encrypted secrets.

## Custom pieces (the complete list)

1. **AI endpoints** (`src/assistant/`): `/api/assistant/chat` streams with the AI SDK and uses Payload's own MCP server (`/api/mcp`) as its tools, acting as the signed-in user and limited to the chat's website. Read-only tools run by themselves; every other tool waits for the editor's approval, which is signed with a key derived from the Payload secret. `/api/assistant/models` (platform admins) lists a service's models; `/api/assistant/capabilities` reports what each enabled model can do. A saved key is only ever sent to the service and https address it was saved for; changing either drops the key unless a new one is given.
2. **Preview grant** (`src/site/preview.ts`): a Payload auth strategy that accepts a short-lived, signed, read-only grant for one website, so a website can read drafts through standard REST with `draft=true`. Only GET and HEAD.
3. **Website refresh hook** (`src/site/revalidate.ts`): after a publish or delete, the website's refresh URL is called with `{ collection, slug, locale }`.
4. **Legacy `/api/site-content`** (`src/site/endpoints.ts`): stays until every website reads Payload's REST API directly.
5. **CMS brand** (`src/site/platform.ts`): the `platform` global chooses a website whose logos the sign-in screen shows.

Rules and validators, all Payload hooks or field validation:

- **First-user guard:** `users` creation is refused unless the caller is a platform admin or the `bootstrap-operator` command (closes Payload's open `first-register` on an empty database).
- **Logos from the own website:** site-settings logos must be media of the same website.
- **Slug rule:** slugs are lowercased and reduced to letters, digits and hyphens on the server (`src/site/slug.ts`), so API and AI saves follow the same rule as the editor.
- **Safe links:** navigation links and preview paths must be site-relative paths; the refresh URL must be https.
- **Access choices:** websites and site settings can't be deleted; only website admins and platform admins delete content; only platform admins move a document to another website; MCP tools for delete, duplicate and version restore are off.

## Known limitations

- **Edit locks are not limited to one website.** Payload generates the `payload-locked-documents` collection itself, with access for any signed-in user, and has no setting to change it. So an editor could mark another website's page as "being edited". The other editor can take over with one click and locks expire after 5 minutes; no content can be read or changed. Patching Payload's generated collection would break on upgrades, so this is accepted.
- **Media lists are public.** Anyone can list `/api/media` across websites, as in Payload's website template. This includes images used only in drafts.
- **Content languages.** Content is stored per locale (NL, EN), but the admin has no language switch for content yet; a better way to manage multilingual pages is still to be designed.

## Testing and CI

Every pull request and every push to `main` runs `.github/workflows/docker-image.yml`. A failing step blocks the release.

| Step | Catches |
| --- | --- |
| `scripts/verify-ui.mjs` | Edited shadcn component files |
| Lint and `tsc --noEmit` | Code and type errors, including API changes in updated packages |
| Migrations, types and import map match the config | A config or Payload change without a matching migration, or stale generated files |
| `npm run test:int` | Access rules, website isolation, secrets, validators (against Postgres) |
| `npm audit` | Known high-severity vulnerabilities in production dependencies |
| Docker build | The production image builds |
| Upgrade from the released image | Migrations or changes that break existing content (`scripts/upgrade-check.sh`) |
| `npm run test:e2e` against the image | Editor journeys, AI chat with a local test model, settings, media, users, password reset, and an accessibility scan (axe, WCAG 2 A/AA) of the main screens in light and dark mode |

Tests never reach the internet: `tests/helpers/test.ts` blocks other hosts in the browser and answers AI provider calls, unless a test uses the local model (`tests/helpers/mock-model.ts`). CI fails on flaky tests.

Run the same checks locally with `npm run lint`, `npx tsc --noEmit`, `npm run test:int` and `npm run test:e2e` (see the README).

## Upgrading dependencies

1. Bump the packages of one family together, with exact versions: `payload` with every `@payloadcms/*` package; `next` with `eslint-config-next`; `react` with `react-dom` and their types; `ai` with `@ai-sdk/*`; `lexical` with `@lexical/*` to the version `@payloadcms/richtext-lexical` uses.
2. Run `npm install`, then `npm run payload -- migrate:create <name>` (keep the migration only if one is created), `npm run generate:types` and `npm run generate:importmap`.
3. Read the release notes for breaking changes. Watch the AI SDK imports from `@ai-sdk/*/internal` and `experimental_toolApprovalSecret` in `src/assistant`, which aren't public API.
4. Open a pull request. CI runs every check above, including the upgrade from the released image.
5. Release as in [deploy/README.md](../deploy/README.md).

Earlier plans and decisions are kept in [docs/archive](archive/).
