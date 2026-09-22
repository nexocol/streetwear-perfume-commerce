# V3 Production Foundation — Cloudflare-native

Visual baseline: V2.6 snapshot branch `snapshot-v2.6` at `ac413629ade4fff7290f4acca429d5c6f43651d1`.

## Final architecture
- React + TypeScript + Vite for the storefront and CMS UI.
- Cloudflare Worker API in the same Worker.
- Cloudflare D1 as catalog/CMS source of truth.
- Cloudflare R2 for uploaded product media.
- Cloudflare Access protects `/admin*` and `/api/admin/*`.
- Static assets continue on the same Worker and same workers.dev URL.
- Preview cart remains localStorage through the CommerceAdapter.
- Shopify remains behind a dedicated adapter and is disabled until real credentials/mappings exist.

## Security
Public routes only expose active catalog data.
Admin mutations require Cloudflare Access context at the Worker API.
Even before the Access policy is configured, admin API requests fail closed because `ctx.access` is required.
Recommended Access applications:
1. `streetwear-perfume-commerce.nexocolmj.workers.dev/admin*`
2. `streetwear-perfume-commerce.nexocolmj.workers.dev/api/admin/*`

## D1 / R2 resources
Expected resource names:
- D1: `streetwear-perfume-commerce-db`
- R2: `streetwear-perfume-commerce-media`

`wrangler.v3.jsonc` is intentionally not production-ready until the real D1 database ID replaces `REPLACE_WITH_D1_DATABASE_ID`.
The Worker contains an idempotent first-run schema/seed initializer and SQL migrations are also preserved under `migrations/`.

## Deployment gate
Do not replace `main` until:
- real D1 + R2 bindings exist;
- Access is configured for admin paths;
- V3 CI is green;
- storefront visual comparison against V2.6 passes;
- storefront and admin E2E pass.
