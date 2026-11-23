# Admin v2: agreed shape and plan (2026-11-21)

Follows `admin-replacement-plan.md`, whose rules all still apply:
- Payload-native backend only, with no invented rules.
- Official shadcn and AI Elements only. Any other library needs the owner's review.
- No AI leaks across websites.
- Payload's own locking.

Inputs:
- The persona usability test ("Sanne").
- Research on AI entry points, providers and naming.
- Research on live preview, the content model and login.

The owner agreed all six points, every obvious or recommended improvement, and the confirmed bug fixes, with one revision: **website members can view the AI connections, read-only.**

## 0. Confirmed bugs (first commit)
1. **Language switch does nothing.**
   - Cause: two `payload-preferences` rows with key `cms` exist for one user (concurrent first saves), and `getPreferences` reads the wrong one.
   - Fix:
     - Read the newest row (`sort: '-updatedAt'`).
     - Serialize client preference saves so two first saves can't race.
     - Delete stale duplicates in a data migration (keep the newest per user and key).
2. **Login form leaks the password into the URL** when submitted before hydration (the form has no method, so the browser sends a GET).
   - Fix: `method="post"`, and the submit button stays disabled until hydrated.
   - Same fix for the forgot-password and reset forms.
3. **`/admin/[site]/assistant` page overflows by 32px at 1280px.** Fix the flex `min-w-0` / width chain.
4. **First media upload gives no feedback.** Fix: a pending tile with a spinner, a success or error toast, and a refreshed grid.
5. **Re-check on a normal run** (the test harness blocked navigation):
   - the publish status, badge and "updated" time refreshing after save;
   - the redirect after the first save of a new document.

   Fix if either reproduces. Either way:
   - the Publish button shows "Published · time" when there are no unpublished changes;
   - a failed save highlights the field Payload names in its error.

## 1. Login: shadcn `login-03`
- Centred card on a muted background, with the Optidigi logo and name above it.
- No social buttons, sign-up link or terms footer.
- Add a show-password toggle (InputGroup button) and a short "Problems signing in? Contact Optidigi" hint.
- Apply to login, forgot and reset.
- Install the block in a scratch copy and move the markup into `src/app/(cms)/admin/(auth)/*` and `src/cms/auth/*`. Generated primitives stay untouched.

## 2. AI entry point: floating prompt bar
- **Remove** `AskField` from the header.
- **Desktop:** a slim prompt bar fixed at the bottom centre of the content area, with:
  - sparkle icon and "Vraag AI… / Ask AI…";
  - ⌘I hint, keeping the existing shortcut that skips inputs and the rich-text editor;
  - a "This page: …" context chip.

  After sending, the bar hides and the existing right-hand AI panel opens and pushes the content aside. Closing the panel brings the bar back.
- **Phone:** a compact bar above the bottom edge. Sending opens the existing Drawer at about 85% height; swiping down returns to the bar and keeps the chat.
- **Collisions:**
  - Pages with a sticky action bar (the document editor on phones, list pagination) get bottom padding.
  - The bar sits above the sticky bar; it never covers it.
- **Hidden:** on the full AI page, and when AI isn't set up for the website.
- **Components:** existing InputGroup, Drawer and panel. No new library.

## 3. Name: "AI"
- **NL:**
  - Field: "Vraag AI…"
  - Panel and page title: "AI"
  - History: "AI-gesprekken"
  - Settings: "AI-instellingen"
- **EN:**
  - Field: "Ask AI…"
  - Panel and page title: "AI"
  - History: "AI chats"
  - Settings: "AI settings"
- The route becomes `/admin/[site]/ai`, and the old `/assistant` redirects to it.
- Collection labels change. Slugs and internal code names stay, so no migration is needed for the rename.
- Leftover English tool texts are translated: tool names become plain verbs (e.g. "Pagina's opgehaald"), and "Tool call execution denied" becomes "Geweigerd".

## 4. Several AI connections per website
**Data.** `assistant-settings` stays one record per website and gains:
- `connections`, an array field. Each row has:
  - `label`;
  - `provider`: one of anthropic, openai, google, mistral, gateway (Vercel AI Gateway), openai-compatible (also used for OpenRouter);
  - `baseURL`, required for openai-compatible;
  - `apiKey`: encrypted, `read: () => false`. The encryption hook compares against the same row's previous value.
  - `models`: the enabled model IDs (hasMany text).
- `defaultModel`, stored as `connectionID:modelID`.
- A migration moves the current single provider, key and models into one connection row.

**Access.**
- **Read:** any signed-in member of the website. This is the existing `signedIn` access plus the multi-tenant scope. The key is never readable by anyone.
- **Create, update, delete:** platform admins only (unchanged).

**Endpoint.** `src/assistant/endpoint.ts` builds an AI SDK `createProviderRegistry` per request, from this website's rows only. It accepts only enabled `connection:model` pairs.

**New official packages (owner approved):** `@ai-sdk/google`, `@ai-sdk/mistral`. OpenRouter goes through `openai-compatible`; there is no community package.

## 5. Loading the model list
- A new Payload endpoint, `POST /api/assistant/models` with body `{ site, connection }`.
  - Only platform admins with access to that website can call it.
  - The stored key is decrypted on the server.
  - It calls the provider's official list endpoint (OpenAI, Anthropic, Gemini, Mistral, OpenRouter, Gateway, or `{baseURL}/models`).
  - It filters to chat models with tools where the provider reports this, and returns `[{ id, name, tools }]`.
  - Results are cached in memory for about 1 hour per website and connection. The key never reaches the browser.
- **Settings UI** (platform admin):
  1. Add a connection: label, provider, key (and address for openai-compatible).
  2. Save.
  3. Click "Load models" to get a checklist with a search filter. Tick the models to use; models without reported tool support are marked.
  4. Choose the default model.

  Manual model ID entry stays as a fallback for self-hosted endpoints.
- **Members' view (the revision):** the same screen, read-only.
  - Shown: connections (label, provider, enabled models, default) and whether a key is set.
  - Not shown: the key, edit controls, "Load models".
- **Chat model picker:** the existing shadcn Select, grouped by connection. The AI Elements Model Selector needs `cmdk`, which the owner didn't approve, so it is not used.

## 6. Content model: sections per website
- A tenant field `sections`, a hasMany select of `articles` and `projects`, default empty. It is platform-only to edit; only `pages` is always on.
- The sidebar, the overview and the `[section]` routes hide or `notFound` the sections a website doesn't use. The MCP tools for those sections stay scoped by tenant as they are today; no new rule is added.
- Articles and Portfolio keep their current fields until a website needs them. Collection-specific fields (date, cover image, client, …) are added when a website actually uses the section; not now.
- Later, outside this plan: a `layout` blocks field on pages when a website needs more than heading and body.

## 7. Live preview inside the editor
- **Desktop:** a "Preview" toggle splits the editor using shadcn `resizable` (base-vega, official). The website loads in an iframe on its `/cms-preview` URL with the existing read-only grant (`previewURL`).
- **Autosave:** while the preview is open (and for drafts generally), the editor autosaves with Payload-native `PATCH …?draft=true&autosave=true`, debounced to about 1.5s. This needs `versions.drafts.autosave` on the content collections. Manual "Save draft" and "Publish" stay.
- After each successful save, the admin posts `{ type: 'payload-document-event' }` to the iframe. This is the same message Payload's admin sends, and it goes only to the website's `siteOrigin`, never `*`. The website re-reads its drafts.
- The website's ready handshake (`{ type: 'payload-live-preview', ready: true }`) is accepted only from `siteOrigin`.
- **Viewport switch:** desktop, tablet or phone width.
- **Phone:** Preview opens full-screen in a sheet. A note explains that it shows the draft website.
- **Fallback:** if the frame doesn't signal ready within about 8s, show "This website doesn't support live preview yet" with an "Open in new tab" button.
- **Website repos (separate work, not in this repo):** `frame-ancestors https://cms.optidigi.nl` on `/cms-preview`. optidigi already listens for `payload-document-event`.
- Out of scope: updates on every keystroke (needs `cors` and per-site request handling) and the paid Visual Editor.

## 8. Tester improvements
- **Plain-Dutch labels:**
  - "Paginakop" → "Titel op de pagina"
  - "Beschrijving" → "Introductie"
  - "Zoekmachines" → "Google-instellingen (SEO)"
  - "Documentvertaling" → "Tekst in: Nederlands / English"
  - "Concept" stays, with a tooltip "Nog niet zichtbaar op je website"

  Plus one-line hints under the key fields. The English labels get matching changes.
- **One name for the AI everywhere** (§3).
- **AI approval card** rendered as a readable sentence, e.g. "Titel van ‘Home’ wijzigen naar ‘…’", with a before/after list of the changed fields, built from the tool input plus the current document read through the user's own access. Raw JSON stays behind a "Details" collapsible. Weigeren and Toestaan sit below, full width on phones.
- **Phone document editor:** Preview, Versions, Delete and the translation toggle move into a "⋯" menu in the sticky action bar. The status badge sits next to the title.
- **Navigation links:** the target becomes a Combobox (shadcn Base UI) of this website's pages, with free text still allowed for external URLs.
- **Header language control** labelled "CMS-taal / CMS language", so it isn't confused with the document translation.
- **Duplicate upload filenames:** keep Payload's native renaming, and show the final filename in the success toast.

## Out of scope
- AI provider setup on prod (the owner does this).
- SMTP.
- Moving websites off `/api/site-content`.
- Website-side `frame-ancestors`.
- Fields for articles and projects.
- Page layout blocks.

## Order of work
Each step is one reviewable commit, with lint, types, integration tests and e2e passing:
1. Bugs (§0)
2. Login (§1)
3. Name and route (§3)
4. Prompt bar (§2)
5. Connections, migration and endpoint (§4)
6. Model loading and settings UI, with the read-only members' view (§5)
7. Sections per website (§6)
8. Autosave and live preview (§7)
9. Remaining improvements (§8)

A reviewer subagent checks for drift from this plan after steps 5, 8 and 9. Then:
- open a PR to main;
- deploy with the same smoke tests as before;
- run a new persona test on the local copy.

**Migrations:**
- the preferences dedupe;
- connections (moving the single settings into a row);
- `tenants.sections`;
- autosave version fields, if the schema changes.

**Tests to add:**
- Members can read connections but never `apiKey` (REST and MCP).
- Only platform admins can call the models endpoint.
- The endpoint rejects a model that isn't enabled.
- Preview messages go only to `siteOrigin`.
- A disabled section returns 404.
- A preferences save after a duplicate still reads the newest row.
