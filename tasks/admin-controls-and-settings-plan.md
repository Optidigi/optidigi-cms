# Admin controls, settings navigation, and website language

## 1. Composer controls

Replace the modal response-options form and native selects with two anchored shadcn Base UI menus inside Prompt Input. Use InputGroupButton, DropdownMenu, and DropdownMenuRadioGroup from the published AI Elements Model Selector pattern. Display the selected values, such as “Effort · Auto” and “Length · Standard”; shorten the visible labels at narrow widths while preserving full accessible names. Reasoning effort lists Auto and the levels declared by the selected model, and disappears when the model offers no effort control. Answer length lists Short, Standard, and Detailed. Each selection applies to the next message immediately. Keep the model picker separate.

Check keyboard navigation, checked values, Escape and focus return, selection in the drawer and full page, narrow-width placement and overflow, and the sent request. Verify that changing to a model with different capabilities clears unsupported effort while retaining prompt text and attachments.

Sources: [shadcn Prompt Input](https://ui.shadcn.com/docs/ai-elements/base/prompt-input), [shadcn Model Selector](https://ui.shadcn.com/docs/ai-elements/base/model-selector).

## 2. Public website and editor preview language

The deployed public HTML contains both switching links. The Dutch homepage links to `/en/`, and the English homepage links to `/`. The Astro header places the switch in the menu that collapses below its desktop breakpoint. The editor iframe can therefore hide the switch behind the hamburger even when the outer CMS is on a desktop. The pilot header's preview branch also builds a public link when the other language is selected. It leaves the signed draft preview.

Make the existing site switch visible in the mobile header and verify spacing with the logo, theme toggle and hamburger. Keep the public switch on the equivalent localized page. In draft preview, use CMS-issued links for each language. The CMS verifies the actor and tenant and provides a separate short-lived grant for each preview locale. Let the website switch select the other signed preview, including from a preview opened in its own tab. Keep interface language in the CMS header, document translation in the editor, and the language being viewed inside the preview. Switching the preview leaves the editing locale, unsaved fields, and public website language preference intact. Show an unavailable state when the alternate draft cannot be previewed.

This crosses `Optidigi/optidigi` (Astro header and preview) and `Optidigi/optidigi-cms` (preview URL signing and editor integration). Make the site changes compatible with existing single-language preview links before introducing paired links. Verify public NL/EN in both directions, iframe and standalone preview, signed draft isolation, expiry, and cross-tenant denial. Serve preview pages with private, no-store caching and no-referrer policy, including standalone previews. Pair independent locale grants with a shared expiry, and revalidate the requested grant on every fetch.

Evidence: [Dutch live site](https://optidigi.nl/), [English live site](https://optidigi.nl/en/), [Astro site header](/home/serveradmin/src/optidigi-cms-pilot/src/components/SiteHeader.astro), [CMS signing](/home/serveradmin/src/optidigi-cms/src/site/preview.ts).

## 3. Personal preferences

Put Account and Preferences on separate panels under Personal. Give Preferences real controls with shadcn Field, Radio Group or Toggle Group, and Select. Start with interface language (NL/EN), theme (System/Light/Dark), sidebar on desktop (Expanded/Collapsed), and a preferred starting website (Last used or one of the user's authorized websites). Include a reset to defaults. Keep Account for email, password, and sign-out; tenant-wide assistant configuration belongs under Assistant.

The existing preferences card exposes only a theme icon. shadcn supplies the controls, and Payload supplies a user-scoped preference store. Save a validated, namespaced preference object through the existing Payload preference API or a thin authenticated adapter. Initialize theme, language, and sidebar before the initial paint using the existing browser preferences as the migration fallback. Preserve the language cookie used by Payload's supporting routes. Validate the preferred website against current server authorization on every use and fall back after access is revoked.

Verify persistence after reload and across browser sessions, reset, compatibility with existing theme and language, separation from document translation, and user-to-user isolation. [Payload preferences](https://payloadcms.com/docs/admin/preferences)

## 4. Settings layout and navigation

The reviewer reproduced two transitions in a local standalone build with a disposable site and account. General → Navigation replaced the form and preview iframe and triggered an RSC fetch and a second preview navigation. The outer shell and settings navigation stayed mounted for this transition. Navigation → My account replaced both shell and settings navigation and made two new assistant requests. With the model-status request delayed by 2.4 seconds, My Account → Models also showed a blank panel followed by a false “Connect a model” message before the configured model appeared. The reviewer confirmed that the settings sidebar drops `locale=en` when navigating from the overview, while the overview card preserves it. These observations distinguish shell remounts, same-form remounts, loading-state misclassification, and locale propagation.

Use a persistent authenticated admin shell and settings navigation. Keep current settings URLs as deep links, with a grouped sidebar on desktop and a compact group selector on mobile. Remove the duplicate overview links from the main settings content once navigation is available. Account or Platform navigation should swap content inside the shell and preserve the selected website where authorized.

Website General, Navigation, and SEO edit the same localized Payload document. Use shadcn Base UI Tabs with `keepMounted` inside the shared website editor. Keep the preview and save controls outside the tab panels and preserve one form and draft revision. Use the Next.js History API to keep the selected tab in the URL without a server refetch on every click. Derive every localized settings link from the same content-locale source and preserve it on direct navigation and Back/Forward. Guard attempts to leave the editor or change document translation when edits are pending. Keep Assistant Models, Defaults, and Connections in a shared local layout that reuses loaded connection state. Memberships and Platform keep route-level data and role checks.

Keep navigation and page headers visible while route data loads. A content-area skeleton and an error state cover genuinely pending or failed reads. Assistant status has distinct loading, error with Retry, disconnected and connected states. Reuse a resolved status scoped to the active website; the Connect Model empty state appears only after a successful disconnected response. Preserve current roles, Payload draft/version operations, and OAuth consent.

Verify direct links, back/forward, fast consecutive changes, throttled cold loads, tab state and unsaved inputs, role visibility, and a stable shell on both desktop and mobile. Use browser recordings for settings transitions and check that same-document tabs do not refetch preview grants or versions. [shadcn Tabs](https://ui.shadcn.com/docs/components/base/tabs), [Next.js layouts](https://nextjs.org/docs/app/api-reference/file-conventions/layout), [Payload presentational tabs](https://payloadcms.com/docs/fields/tabs), [Base UI Tabs panels](https://base-ui.com/react/components/tabs#panel), [Next.js History API](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api).

## 5. Floating Ask AI

Move the verified assistant trigger to a fixed bottom-end “Ask AI” pill. Use the existing shadcn Button and Sheet trigger. The official shadcn AI Elements catalog has composer and conversation patterns. The closest AI-specific launcher reference is the assistant-ui AssistantModal registry component, which demonstrates a floating trigger. Adopt the trigger interaction, with the existing Optidigi Sheet and chat provider handling the conversation.

Leave space above bottom controls and respect the mobile safe area. Hide the pill while the drawer is open and on the full assistant page. Preserve editor and settings actions, model membership gating, drawer-to-page conversation continuity, keyboard focus return and Escape. Verify at narrow widths and with a mobile keyboard, publish controls, settings forms, the chat drawer, and the full chat page. [assistant-ui floating launcher](https://www.assistant-ui.com/docs/primitives/assistant-modal), [shadcn Sheet](https://ui.shadcn.com/docs/components/base/sheet).

## Settings component specification

Use the Base UI variants to match the CMS. Use one settings heading and a predictable form width, with labels, descriptions, validation, and actions in the same positions across groups.

| Surface | shadcn component and behavior |
| --- | --- |
| Settings navigation | SidebarGroup and SidebarMenuButton for the destination list. On mobile, a labeled Sheet opens the same grouped links, closes on navigation, and returns focus to its trigger. |
| Website editor | Line-style Tabs for General, Navigation, and SEO. Keep tab panels mounted and place the language selector, preview, and sticky draft/publish bar at the editor level. |
| Personal preferences | FieldSet and FieldGroup with Radio Group choice cards for System, Light, and Dark, including small theme previews. Use a compact labeled Radio Group for interface language and a Switch for “Start with sidebar expanded.” Use a searchable Combobox for the authorized starting website, with “Last used” as the default. |
| Account and website forms | Field labels, descriptions, and inline FieldError. Show the result of a save in the form and preserve inputs on errors. Use AlertDialog for disconnecting a provider or discarding unsaved edits. |
| Assistant settings | Compact Tabs for Models, Defaults, and Connections when they share the loaded catalog. Use a Table for enabled models, a default Badge, and a focused Sheet for adding or editing a model. Use a connection status Badge and a separate Alert with Retry when status fails. Use Radio Group for the three answer lengths and Select for an enabled default model. |
| Members and platform lists | Table for members and roles. Use filterable Data Table patterns on platform lists where they support existing server search and pagination. Open existing record forms from a row action, using a Sheet for short forms and the focused editor for membership-heavy forms. |

Review the actual controls in light and dark at desktop and mobile widths. Verify labels and values without relying on icons or color, keyboard operation, validation and save feedback, and slow-load transitions before wiring the remaining screens.

References: [Sidebar](https://ui.shadcn.com/docs/components/base/sidebar), [Field](https://ui.shadcn.com/docs/components/base/field), [Radio Group](https://ui.shadcn.com/docs/components/base/radio-group), [Combobox](https://ui.shadcn.com/docs/components/base/combobox), [Alert Dialog](https://ui.shadcn.com/docs/components/base/alert-dialog).

## Implementation order

1. Verify and ship the site language fix as a coordinated CMS/site change. Test signed preview and public links on both devices.
2. Adapt the AI Elements menus and floating launcher. Verify keyboard, drawer and composer interactions on fixtures.
3. Stabilize route layout and settings data lifecycles. Recheck the recorded transition baseline before adding preferences.
4. Connect personal preference controls and verify role and persistence behavior. Review actual desktop and mobile candidates before promotion.
