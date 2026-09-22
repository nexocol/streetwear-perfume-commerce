# V3 Production Foundation

V2.6 visual snapshot: `snapshot-v2.6` at `ac413629ade4fff7290f4acca429d5c6f43651d1`.

## Migration rules
- Preserve V2.6 visual classes and CSS.
- React/TypeScript owns routing and components.
- Supabase owns catalog, CMS content, auth and media metadata/storage.
- localStorage is only used by the preview cart.
- Shopify lives behind the CommerceAdapter and is disabled until credentials exist.
- Production `main` is not replaced until V3 passes storefront + admin E2E.

## Required Cloudflare build variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PREVIEW_NOINDEX=true`
- `VITE_COMMERCE_PROVIDER=preview`

## Admin bootstrap
1. Create one Auth user in Supabase Dashboard (no public registration UI exists).
2. Insert that Auth user's UUID into `public.admin_users`.
3. Admin sign-in uses email/password and RLS gates all writes.
