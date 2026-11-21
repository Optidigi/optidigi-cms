# Admin replacement plan

Agreed with the owner on 2026-11-21. This plan replaces `admin-rebuild-plan.md`, `admin-ui-audit.md`, `admin-controls-and-settings-plan.md`, `admin-entry-and-preferences-plan.md`, `plan.md` and `todo.md`. Those files will be removed in phase 1.

## Principles

- **Fresh UI everywhere.** The admin lives in its own route group, `src/app/(cms)/admin`. It uses only official shadcn components (style `base-vega`, Base UI), including the AI Elements patterns. Generated primitives stay as generated; adapt them only through composition and theme tokens.
- **Official components only.** Libraries that official shadcn components install themselves are allowed: TanStack Table (data table), react-day-picker (calendar), Recharts (chart). Lexical, which Payload already uses, is the rich-text engine. Any other library needs review first.
- **Native Payload backend.** The UI uses Payload REST, the Local API in server components with `overrideAccess: false`, and Payload's built-in auth, drafts, versions, locking, localization, uploads and preferences.
- **No invented rules.** Do not add rules that drift from Payload without discussing them first. The only custom backend pieces are the ones listed below.
- **Keep production running.** It stays on the current image until the replacement is reviewed locally. Then cut over once. The CMS is not in use yet, so timing is flexible.

## Custom backend pieces (the complete list)

1. **AI endpoint.** One Payload `endpoints` entry. It runs AI SDK `streamText` and uses Payload's own `/api/mcp` (plugin-mcp) as its tool source, acting as the signed-in user. Alongside it:
   - A per-user, per-website chat history collection, protected by normal access rules.
   - Per-website model settings. API keys are encrypted with `payload.encrypt` / `decrypt` in field hooks.
   - **Website isolation:** every AI read and write is limited to the chat's website through the multi-tenant plugin's `accessResultOverride`. This prevents the AI from reaching another website the same user can access.
2. **Website preview pass.** A Payload auth strategy that accepts a short-lived, read-only preview grant for one website and one locale. External websites use it to read drafts through standard REST with `draft=true`. Each website has a preview URL pattern setting, so all pages, articles and portfolio items can be previewed, not only the home page.
3. **Website refresh hook.** `afterChange` / `afterDelete` notify the website after publish, modelled on the official website template.
4. **Legacy `/api/site-content`.** Stays unchanged until every website has moved to native reads. It is removed after that, in a separate step.

## Decisions

- **Edit conflicts:** Payload's built-in document locking.
- **Account changes:** Payload's native user update; no extra current-password rule.
- **Members:** platform admins only for now. This follows the current `users` access rules.
- **Published content:** public through Payload's normal reads. Access returns everything to signed-in users and only `_status: published` to everyone else. The `tenants` collection is publicly readable, but only its `slug` field.
- **MCP consent:** the plugin's own `/admin/mcp/authorize` page stays as it is. There is no fallback Payload admin.
- **Email:** add `@payloadcms/email-nodemailer` with SMTP settings from env. Without SMTP configured it delivers nothing. The SMTP provider (Cloudflare) is out of scope.
- **Old data:** drop the old assistant collections (credentials, delete receipts, threads, messages, uploads) with a Payload migration. Start fresh.
- **AI chat UI:** official shadcn AI Elements and chat components, with state from AI SDK `useChat` (one shared `Chat` instance). Do not use assistant-ui: it is not official shadcn, it can overwrite `components/ui` files, it installs Radix, and it adds about 6 packages on a fast-moving 0.x line. Markdown is rendered with Streamdown, which the shadcn Message and Code Block docs recommend. We build these ourselves:
  - a thread list on Sidebar, with our own thread endpoints;
  - attachment upload, drag-and-drop and paste;
  - edit-and-resend;
  - copy and feedback actions;
  - one renderer per tool;
  - the NL/EN strings.
  Message branching is out of scope for now.
- **Payload 4 beta:** pin exact versions; upgrade deliberately.

## Screens

| Area | Routes | Notes |
| --- | --- | --- |
| Auth | `/admin/login`, `/admin/forgot`, `/admin/reset/[token]` | `login-0x` block. Native `/api/users/login`, `forgot-password` and `reset-password`. |
| Overview | `/admin/[site]` | Drafts waiting, recent edits, AI shortcut |
| Content | `/admin/[site]/{pages,articles,portfolio}`, `/new`, `/[id]` | Data Table pattern with search, filters, sort and paging in the URL. The editor has draft/publish, locking, NL/EN document translation, versions with restore, and preview. |
| Media | `/admin/[site]/media`, `/[id]` | Grid of Card + AspectRatio; uploads via Attachment, Empty and native drag-and-drop; details in a Sheet |
| Assistant | `/admin/[site]/assistant`, `/[thread]` | Chat history list, the Chat pattern, PromptInput, ModelSelector, Tool, Confirmation |
| Settings | `/admin/[site]/settings/{general,navigation,seo,assistant}`, `/admin/account/{profile,preferences}`, `/admin/platform/{websites,users}` | One settings layout. Platform pages are for platform admins only. |

**App shell.** The Sidebar `sidebar-07` pattern with a website switcher, breadcrumbs, NL/EN interface language and an account menu. The header has an "Ask AI… ⌘I" field that opens a second Sidebar on the right (`side="right"`), which pushes the page aside rather than covering it. Desktop and full page share one AI SDK `Chat` instance. On mobile the left sidebar becomes a Sheet and the AI opens in a Drawer. There is no floating button.

**Rich text.** Lexical, limited to the features enabled in the Payload editor config. The toolbar uses Toggle, ToggleGroup and ButtonGroup. Links and images open in Popover / Dialog.

## Phases

1. **Payload cleanup** (production stays on the current image).
   - Remove `/api/cms-admin/*`, `src/site/admin/*` and the invented rules (including the home-page lock and the rich-text node allowlist).
   - Add public published-read access and email-nodemailer.
   - Add the migration that drops the old assistant collections.
   - Remove the old task documents, stale local branches and empty folders.
2. **CMS UI.** Generate the official components and blocks fresh. Build the shell, auth pages, overview, content lists, editor, media and settings. Then remove `src/app/(admin)` and `src/admin/*`.
3. **AI.** Build the endpoint, chat history, model settings and website isolation, plus the full page, the right-hand panel and the mobile drawer.
4. **Review and cutover.** Owner reviews desktop and mobile locally against disposable data. Keep checks fast: typecheck, lint, integration tests, targeted e2e. Then release once through CI/GHCR with a pinned digest; the rollback digest is the image running before cutover.
5. **Websites** (separate). Add the preview pass, preview URL patterns and the refresh hook. Move each website to native reads, then remove `/api/site-content` and the old preview code.

## Isolation checks (must pass before cutover)

- An AI chat on website A cannot read, create, update or delete anything on website B, even when the user is a member of both.
- Chat history, uploads and model settings are visible only to their owner or website, as the access rules intend.
- Anonymous reads return published documents only and expose no internal fields.
