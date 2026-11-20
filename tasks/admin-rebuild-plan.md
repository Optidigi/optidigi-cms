# Optidigi CMS admin and assistant rebuild

## Confirmed gaps

The previous release moved the comparison UI under `/admin`, changed its HTTP integration, and kept much of its presentation. Its stylesheet moved unchanged. [Release diff](https://github.com/Optidigi/optidigi-cms/compare/15fbcaa...e260fc5)

- The composer shows the connected model as a dropdown for site admins, with one action that opens settings. Other users see a badge. The credential schema permits one connection per tenant, and the chat request carries no model selection. A working picker needs a server-authorized model catalog. See `src/admin/assistant.tsx`, `src/assistant/credentials.ts`, and `src/assistant/endpoints.ts`.
- The header renders an icon, the word Language on desktop, and the locale code. The replacement presents just NL or EN, with an accessible name and both languages named in the menu. See `src/admin/language-menu.tsx`.
- Media uses a narrower outer container than Pages, Articles, and Portfolio. These are peer collection views. Standardize their width, padding, heading, actions, and filters. Use a narrower reading column inside the editor, settings, or chat where the content warrants it. See the Media and editorial section routes.
- Account and platform administration use standalone layouts. The site settings landing and assistant configuration introduce additional layout variations. Put the settings screens inside the common admin shell. Keep direct URLs and preserve the originating website when returning from personal or platform settings.

## Template decisions

| Source | Adopt for this build | Optidigi integration |
| --- | --- | --- |
| [Kiranism Next Shadcn Dashboard Starter](https://github.com/Kiranism/next-shadcn-dashboard-starter/tree/89f4e257650905a3a206f8449757f981bb811306) | The dashboard shell, grouped sidebar, workspace switcher pattern, breadcrumbs, profile menu, shared PageContainer, URL-synced collection filters and pagination, and detail forms. Use the products list and form and the users table and form sheet as concrete starting points. | Map workspace navigation, table filters, and forms to Payload schemas and access rules. Use Payload sessions, tenant membership, drafts, version history, signed preview, and publishing. |
| [Vercel Chatbot](https://github.com/vercel/chatbot/tree/a8989b522fa3672a2ae52f053105e40993b36ca1/components/chat) | The full conversation layout, persistent history sidebar, new-chat state, multimodal composer, attachment previews, message actions, and mobile history. Use its model picker pattern with shadcn primitives. | Connect the UI to existing assistant endpoints, private uploads, media-library attachments, threads, context, and approval flows. Keep auth, history, secrets, and execution in Optidigi's backend. |
| [Official shadcn chatbot-template](https://github.com/shadcn-ui/chatbot-template/tree/4106041b1bc9bab44e81ffd2764aa2b6f100e2b0) | The compact model select, Markdown and code rendering, scroll anchoring, tool traces, streaming and stop states, and message actions where they improve the Vercel shell. | Translate tool activity into CMS-specific results and approval cards. History and attachments are covered by the Vercel shell and Optidigi services. Keep Optidigi's approval protocol and provider routing. |

Build the shell, settings workspace, and chat surfaces from these template components. Reuse Payload and assistant service contracts and domain-specific behavior. Keep public chat sharing and demo features outside this release. Adapt Vercel's UI to the repo's Base UI components. Carry over the [Vercel Apache-2.0 license and applicable notices](https://github.com/vercel/chatbot/blob/a8989b522fa3672a2ae52f053105e40993b36ca1/LICENSE) for copied code.

## Final product shape

### CMS

- A single desktop shell with a website switcher, breadcrumbs, primary action, assistant launcher, NL/EN control, and account menu. The same navigation collapses to a mobile sheet.
- Main navigation contains Overview, Content (Pages, Articles, Portfolio), Media, and Assistant. Settings opens a scoped workspace. Content and Media share a page container and list tools. Media can use a gallery within that container.
- One document workspace with editing and publication status, draft and publish actions, translation, revision history, and signed preview on supported pages. Preserve existing Lexical nodes and data. Verify round trips with links, lists, existing embeds, and translated drafts. Keep stock Payload consent and recovery at their existing routes.

### Settings

| Group | Screens and controls | Access and dependency |
| --- | --- | --- |
| Personal | Profile and email, password, interface language and appearance | Each signed-in user manages their own account. Use the current account actions and preferences. |
| Website | General identity and contact, Navigation, SEO, and publishing status or preview readiness | Existing site settings and editorial permissions. Separate screens can save their own fields without clearing neighboring settings or translations. |
| Website access | Members and roles | Site admins see membership for their own website. Platform admins retain management through Users and memberships until a scoped delegation endpoint exists. Provide a role-aware read endpoint for site admins. |
| Website assistant | Assistant defaults, Models, and Connections | Editors see enabled models and manage per-chat options. Tenant admins set the default, enable or disable models, set response defaults, and test or rotate connections. Catalog, defaults, and connection status require backend support. |
| Platform | Websites, Users and memberships | Platform admins manage the existing records from a searchable list and a focused editor or sheet. |

Settings share scoped navigation, a page header and description, consistent form layout and actions, validation, success feedback, and unsaved-change handling. A mobile scope chooser replaces the desktop settings sidebar.

### Assistant

- The full page has searchable history, New chat, a conversation, and the composer. History includes active and archived chats, rename, and delete confirmation. The drawer uses the same conversation and composer with compact history access and a clear expand action. Expanding preserves the thread, draft text, pending attachments, and any in-progress response.
- The empty state offers prompts suited to the current CMS page. The composer shows removable attachment previews and optional document context. Answer length and supported reasoning options sit under one options control. Reply actions include copy, stop, and retry. Tool activity shows pending, completed, or failed states, with the existing approval controls and links to affected drafts.
- The model picker lists enabled models by friendly name, with a selected state and a tenant default. A site with one enabled model shows its name as read-only text. A disconnected site has a clear empty state. An authorized admin can follow a setup action from that state. Routine selection stays inside chat.
- Add a server-side enabled-model catalog backed by existing encrypted connections. A selected model travels as an opaque ID, and each send validates it against the active tenant and the user's access. Requests without a selection resolve the tenant default. Label generated replies with the actual selected model. Preserve existing connections as enabled defaults and keep old requests working during the transition.
- Retry is a distinct operation with defined message and attachment behavior. It must preserve the original reply if retry fails and must avoid silently repeating tools with CMS side effects. Treat expired uploads, interrupted streams, and disabled models as recoverable states with direct guidance.

## Delivery and acceptance

1. **Template composition.** Build the new shell and page container, settings navigation, and chat shell in the replacement frontend. Use fixtures to review desktop and mobile for the dashboard, collections, settings, full chat, and drawer. Compare against upstream layouts and the deployed UI before wiring the remaining flows. Check the NL/EN control and consistent collection width.
2. **CMS and settings.** Wire collection tables, media, editorial forms, and personal, website, and platform settings. Verify search and filters, upload and delete, edit and publish, preview scope, translation independence, revision restores, direct settings URLs, and role-specific visibility.
3. **Assistant.** Add the model catalog and default migration, then connect the composer and history. Test one-model, multiple-model, and disconnected tenants. Exercise the drawer-to-page handoff, history on reload, upload failures, failed and stopped streams, safe retry, and approvals. Verify model IDs, threads, uploads, settings and credentials stay tenant-scoped.
4. **Release.** Review the actual desktop and mobile candidate before promotion. Run editor, tenant-admin, and platform-admin journeys, preserve built-in MCP sign-in and consent, and validate a real response with an attachment through the candidate. Run the existing CI/GHCR release checks, record the running image and migration compatibility, pin Compose to the tested digest, and smoke-test live sign-in, publishing and assistant. Prove that the rollback image still resolves the original encrypted tenant connection after the additive model migration. Keep the legacy connection mapping until that rollback window closes. If the migration makes the rollback image incompatible, resolve that before cutover.

This plan covers the next build. The current release checklist in `tasks/plan.md` and `tasks/todo.md` records the earlier rollout.
