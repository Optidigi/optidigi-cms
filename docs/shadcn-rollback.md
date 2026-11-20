# Shadcn redesign baseline

Recorded before any redesign changes on 2026-11-20.

- Git baseline: `fe3a23a99ea81a1ec5429b061f58fc305236d7cc`
- Local Git tag: `pre-shadcn-admin-2026-11-20`
- Production image: `ghcr.io/optidigi/optidigi-cms@sha256:7ec70203d3540cfd111ae3caba7037e2e56ff57b38f5b0780ceed9ab9c020080`

The first slice lives on `feature/shadcn-admin` and mounts at `/studio`. It does not replace the current production admin or change the schema. To discard the slice, return to the baseline branch. For a future production cutover, restore the image digest through the [Compose release steps](../deploy/README.md) after checking migration compatibility.

## Local verification

The slice supports Dutch homepage save, signed preview, and publish. English draft editing is available while the public pilot renderer remains Dutch. The existing assistant endpoint is reused and model connections are still configured in the existing admin. The browser smoke test uses a local Postgres fixture, a mocked preview frame, and a mocked provider response for chat.

Use a built standalone server for verification. Turbopack development mode produced a browser reload loop during the first smoke test.
