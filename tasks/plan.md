# Canonical admin release

1. Use Kiranism's Next Shadcn Dashboard Starter for the sidebar, header and page layout. Use shadcn-ui/chatbot-template for the conversation layout and streaming UI. Keep Payload auth and the assistant service.
2. Remove the alternate admin routes and native theme. Keep Payload's built-in consent view and exact OAuth callback path. Record the production image before cleanup.
3. Use authenticated HTTP for editor reads and mutations. Preserve existing Lexical JSON, localized drafts, revision checks and signed previews. Verify editor and platform workflows, consent, tenant isolation, mobile, history, attachments and a real model response before Compose cutover.

Rollback image observed on prod: `ghcr.io/optidigi/optidigi-cms@sha256:1c3d3373dd5fefc94a81f78b916966384d975ade9ac7e97d033251dbdb7b9ae6`.
