# Login, assistant entry, and personal settings

Plan for the CMS at release `6865592`. Use official Base Vega components and existing Payload and assistant services. Keep the generated primitive files under the existing shadcn provenance check. App composition can set layout, labels, state, and theme tokens through public APIs.

## Login

Use the official **login-03** page shell with the credential form arrangement from **login-01**. Login-01 is the minimal email/password layout. Login-03 adds a branded header and muted background with the form centered. Login-02 and login-04 use a desktop image, which adds an artwork requirement. Login-05 is email-only. Verified all five in the Base Vega registry. [Upstream login blocks](https://ui.shadcn.com/blocks/login), [Base Vega login-03 registry](https://ui.shadcn.com/r/styles/base-vega/login-03.json).

- Put the Optidigi identity and sign-in heading above a focused credential card. Retain NL/EN and theme controls. Use Field and FieldError for form input validation, Alert for authentication or service failure, and a Spinner in the pending submit button.
- Put Forgot password next to the password label. Keep password-manager and autofill support. Keep account-changed feedback wired to the account update return flow. Keep existing Payload login and session behavior and the allowlisted return to MCP consent. Omit demo providers and registration links.
- Keep the existing Payload forgot-password route. The mail adapter and reset-email delivery verification are deferred and do not block the login refresh. [Payload authentication operations](https://payloadcms.com/docs/authentication/operations), [Payload email](https://payloadcms.com/docs/email/overview).

## Assistant composer

The single-model branch currently renders a `text-xs` span. Effort and Length use `InputGroupButton`, whose base class is `text-sm`. The toolbar also explicitly wraps and shows both the control name and value. [Current composer](/home/serveradmin/src/optidigi-cms/src/admin/assistant.tsx).

Use the official Prompt Input and Model Selector composition with the smaller Input Group button sizes. Keep one row at standard phone widths: **Attach · Model · Response options · Send/Stop**. Use a compact shadcn Dropdown Menu icon trigger for Response options, with separate radio groups for answer length and supported reasoning effort. Include the active values in the trigger's accessible name. The model gets the flexible width and truncates long names. Use the existing searchable Combobox where there is a model choice and a matching text treatment when there is only one model. Keep file previews above the textarea. Verify one-row fit at 320px/390px in NL and EN with long names and streaming controls, plus accessible reflow at high zoom. [Prompt Input](https://ui.shadcn.com/docs/ai-elements/base/prompt-input), [Model Selector](https://ui.shadcn.com/docs/ai-elements/base/model-selector).

## Prompt-style launcher

Replace the docked pill with a real, single-line shadcn Input Group in the same reserved footer lane. Use a Sparkles addon and an open-chat button. The placeholder reflects context, for example “Ask about this page…” where the editor has a document selected. Typing updates the assistant's existing draft. Enter or the icon opens the existing Sheet and moves focus to the full composer with the draft in place. Sending happens from that composer. Retain the active conversation, context, attachments, keyboard behavior, and tenant access checks.

The official AI Elements catalog gives us the Prompt Input composition and Suggestion buttons. Input Group and Sheet handle the launcher without adding a chat runtime. assistant-ui's AssistantModal supplies a floating launcher reference through a separate set of primitives; it would duplicate infrastructure we already have. [Input Group](https://ui.shadcn.com/docs/components/base/input-group), [Sheet](https://ui.shadcn.com/docs/components/base/sheet), [AI Elements](https://ui.shadcn.com/docs/ai-elements), [AssistantModal reference](https://www.assistant-ui.com/docs/primitives/assistant-modal).

## Settings and token choices

Use one settings navigation and one clear destination heading. Use Sidebar and Sheet for page navigation, Tabs for sections of one form, and Field for labels, descriptions, and validation. Visually group related fields with FieldSet, Separator, and a small number of Card sections. Use stock controls for each type of choice. [Sidebar](https://ui.shadcn.com/docs/components/base/sidebar), [Tabs](https://ui.shadcn.com/docs/components/base/tabs), [Field](https://ui.shadcn.com/docs/components/base/field).

| Section | Initial scope |
| --- | --- |
| Account | Email, password, and sign-out. Use existing Payload actions and return paths. |
| Appearance | System, Light, and Dark. Add a small, contrast-tested set of named visual presets with preview cards. Presets control approved semantic colors and radius in CSS. Use Radio Group for the single choice. |
| Workspace | Interface language, authorized starting website, sidebar start state, and Comfortable/Compact table density. Use a language Radio Group, Combobox for websites, Switch for sidebar, and Toggle Group for density, with density wired to CMS collection rows. |
| Website and Platform | Keep General, Navigation, SEO, Members, Websites, and Users scoped as they are. Use consistent form actions and status feedback across sections. |
| Assistant | Connections, enabled Models, and website Defaults for the authorized roles. Explain that connection and model defaults apply to the website, while effort and length in the composer apply to the next message. |

Use shadcn/create to preview the base theme and preset choices at design time. Apply each approved preset with a root data attribute and semantic CSS variables such as primary, foreground, and radius. Keep the generated primitives as one Base Vega set. Persist additional preference fields as optional or defaulted properties in the existing namespaced Payload preference. Resolve them during initial render so theme and density are present on first paint. Validate palette contrast in light and dark and each user's ability to access the starting site. Keep scope to curated presets, with a reset and observable density behavior. [shadcn theming](https://ui.shadcn.com/docs/theming), [shadcn/create](https://ui.shadcn.com/create), [Payload preferences](https://payloadcms.com/docs/admin/preferences).

## Payload and shadcn upgrade boundaries

- The custom frontend reads and writes through authenticated Payload REST and the existing narrow CMS endpoints. Keep tenant enforcement, preference ownership, drafts, publishing, preview signing, and model execution on the backend. Keep native recovery and MCP consent in the dedicated Payload route group.
- Centralize the assumptions about Payload REST responses and the session cookie in the existing auth and preferences boundary. Use the cookie issued and cleared by Payload. Audit the fallback cookie handling where the current frontend depends on the default `payload-token` name.
- The installed Payload and Payload packages are pinned together at `4.0.0-beta.10`. Each Payload upgrade should be its own candidate, with all related packages updated together and generated types/import map refreshed. Verify against the migrated candidate before switching the public image.
- The custom Lexical editor imports Payload's node classes, and the relationship/upload decorators currently clone fields such as `__data` and `__format`. Keep that integration isolated. Prefer public node methods where supported, and verify saved Payload JSON round trips with links, embeds, lists, and translations. The HTTP boundary reduces coupling, and these node and native-view integrations still need an upgrade test.
- Run Payload upgrade tests for sign-in/out and recovery delivery, MCP return and consent, tenant roles, preference read/write/reset, locale drafts, preview, publish, media, and Lexical round trips. Run a separate review of the generated shadcn files and visuals for shadcn upgrades. [Payload REST](https://payloadcms.com/docs/rest-api/overview), [Payload dependency guidance](https://payloadcms.com/docs/troubleshooting/troubleshooting).

## Delivery sequence

1. Adapt the official login blocks and verify credential handling, the recovery link, and the MCP return path. Mail adapter setup and reset delivery are deferred.
2. Build the one-row composer and prompt launcher with existing chat state. Verify phone and desktop interaction and one real send.
3. Build the grouped settings form and curated presets. Verify persistence in a fresh session, display density, keyboard use, and contrast.
4. Verify the update boundaries and test the production build before deployment.
