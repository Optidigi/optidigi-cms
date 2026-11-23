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

## Kept access rules and validators

These all use Payload's own mechanisms. They were in place before the replacement and are kept on purpose.

- **First-user guard.** `users` `beforeValidate` refuses creation unless the caller is a platform admin or the `bootstrap-operator` command. Without it, Payload's `/api/users/first-register` lets anyone create the first user on an empty database.
- **Security validators.** `tenants.siteOrigin` must be an HTTPS origin, because preview URLs and the refresh hook use it. Site-settings navigation `href` must be a site-relative path, because websites render it as a link.
- **Access choices.**
  - Tenants and site settings cannot be deleted.
  - Only website admins and platform admins can delete content (`tenantDelete`).
  - Only platform admins can move a document to another website (`tenantField.update`).
  - MCP tools for delete, duplicate and version restore are off.
- **Public media.** Media is publicly readable, as in Payload's website template. This includes images used only in drafts. Anonymous reads of pages, articles, projects and site settings return published documents only.

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

## Implementation notes

Decisions made while building, recorded here so reviews can check against them.

- **Assistant panel.** The panel is a right-hand column in the app layout, not a second `SidebarProvider`. Two providers would share the `⌘B` shortcut and the `sidebar_state` cookie. The column still pushes the page aside, and on mobile it is the official Drawer. `⌘I` toggles it.
- **Content lists.** These use the official Table with a URL-driven toolbar (search, status, translation) and Payload doing the filtering and paging on the server. They do not use the client-side TanStack Data Table, because Payload already does that work. Sorting is newest first; there is no sort control yet.
- **Publishing.** Publishing uses Payload's default, which validates and publishes every translation of the document, and the editor says so. Per-locale publishing would need `versions.drafts.localizeStatus`, which has not been decided.
- **Version restore.** Restore uses Payload's native endpoint and brings back every translation as a draft.
- **Assistant settings.** Website members can read the configured models. Only platform admins can change the provider, key or models (`assistant-settings` access). No new role rule was added.
- **Assistant storage.**
  - `assistant-settings` (one per website), `assistant-threads` (messages as JSON) and `assistant-files` (private images) are Payload collections with versions turned off.
  - Chats and files belong to their creator through Payload's `createdBy` authorship field.
  - Model keys are encrypted with `payload.encrypt`, and their field access never returns them.
- **Assistant tools.** The tools come from Payload's own MCP server. A tool runs without asking only when the MCP plugin marks it `readOnlyHint: true`; every other tool waits for the editor's approval.
  - The approval card shows the proposed change.
  - Approvals are signed with a key derived from the Payload secret.
  - The server copies only the approval answers onto its stored message; the client cannot rewrite tool calls or outputs.
- **Message feedback.** Thumbs up/down is not built, because there is nowhere to store it. Copy, retry and edit-and-resend are built.
- **Website preview (phase 5, CMS side).**
  - The `preview-grant` auth strategy accepts the signed grant only on GET and HEAD requests, so it cannot write through REST, GraphQL or MCP.
  - It signs in as the grant's user, limited to the grant's website as an editor.
  - Each website has preview address patterns (`previewPaths`) and an optional refresh URL and secret. Published changes `POST { collection, slug, locale }` to that URL.
  - The legacy `/api/site-content` and its grant check stay until every website has moved.
- **Media IDs.** Payload 4 adds `createdBy` and `updatedBy` to every collection, so anonymous reads see numeric user IDs (never user data).

## Phases

1. **Payload cleanup** (production stays on the current image). The old admin UI was removed in this phase too, because it cannot run without the old endpoints. The branch has no admin UI until phase 2 lands.
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
