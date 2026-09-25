# V4.4G — Perfumes: data model, CMS, PDP and verified content

## Data model
`products.fragrance_family TEXT NULL` / `Product.fragranceFamily: string | null`. Only meaningful for the Perfumes category; NULL everywhere else.
The PDP shows `FAMILIA OLFATIVA → product.fragranceFamily || 'Por confirmar'`. The CMS shows a "Familia olfativa" input only for Perfumes.

## Schema versions (`src/server/schema.ts`, `ensureDatabase` in `src/worker.ts`)
| version | content | how it is applied |
|---|---|---|
| 1 | initial schema (`SCHEMA_SQL`) + seed (`SEED_SQL`) | only when `schema_migrations` has no row 1 (brand-new DB) |
| 2 | `ALTER TABLE products ADD COLUMN fragrance_family TEXT` | once, when `schema_migrations` has no row 2 |

`ensureDatabase` (runs once per Worker isolate, before any API call):
1. If `schema_migrations` does not exist → run `SCHEMA_SQL` (v1 tables).
2. Read every applied version. If **1 is missing** → run `SEED_SQL` and record 1. An existing database (row 1 present) never re-runs the seed.
3. If **2 is missing** → `migrateToV2`: check `pragma_table_info('products')`; `ALTER TABLE` only if the column is absent (a concurrent isolate that loses the race gets `duplicate column name`, which is swallowed); then `INSERT OR IGNORE INTO schema_migrations(version) VALUES(2)`.

Consequences: a brand-new DB goes v1 → v2 in the same request; production (only row 1, 28 products / 120 variants) gets exactly one `ALTER TABLE ... ADD COLUMN` (metadata-only in SQLite/D1, no row rewrite) and row 2. No data is rewritten and nothing is re-seeded.
`saveProduct` writes the new column; a save payload that **omits** `fragranceFamily` (stale cached client) preserves the stored value instead of wiping it (`'fragranceFamily' in p`). Blank/whitespace clears to NULL, values are trimmed.

`migrations/0001…0002` are the historical V1 files and are unchanged. Do not add a `0003` file there: the Worker owns schema versioning, and if someone runs `wrangler d1 migrations apply` the Worker's column check makes the two paths compatible anyway.

## Rollback
- **Code**: `wrangler rollback` to the previous version. The old Worker ignores the extra column (`SELECT p.*` maps only known fields; its `saveProduct` does not touch it), so the extra NULL/filled column is harmless.
- **Content**: `scripts/sql/v44g-perfumes-content-rollback.sql` restores the exact pre-V4.4G values of `perfume-01` / `perfume-02` (name, name_status, subtitle, description, features_json, fragrance_family=NULL).
- **Column**: intentionally **not** dropped automatically (`ALTER TABLE ... DROP COLUMN` on production D1 is not worth the risk for an unused nullable column). If it is ever required, do it manually after the code no longer references it, and delete row 2 from `schema_migrations` only if the column was actually dropped.

## Content SQL (not applied to production by this branch)
`scripts/sql/v44g-perfumes-content.sql` updates only `perfume-01` / `perfume-02` (guarded by `id AND slug`) and only: `name, name_status, subtitle, description, fragrance_family, features_json, updated_at`.
Apply order in production: deploy the code → make any request (or `GET /api/health`) so the Worker runs migration v2 → verify `pragma_table_info('products')` → run the content SQL with `wrangler d1 execute streetwear-perfume-commerce-db --remote --file scripts/sql/v44g-perfumes-content.sql`.

## QA
- `npm run qa:migration` (needs `npm run build` first): real Worker + **local** D1; covers V1 (28 products / 120 variants) → V2, restart idempotency, column-already-present, brand-new DB, save/duplicate, content SQL scope, rollback SQL. `-- --from-export <file>` runs it on an export of the real database.
- `tests/v44g.spec.ts`: content fixture, PDP, NULL fallback, CMS field, search, responsive (1440/1280/1024/768/430/390) for PDP and cards on Shop / Search / Home.

## Content provenance
- Valentino Donna Born in Roma EDP: Valentino Beauty product page (Amber Floral; Sambac Jasmine top, Cashmeran heart, Vanilla Bourbon base). Only the three official notes are used.
- Lattafa Badee Al Oud Noble Blush: Lattafa product page (Rose Milk / Almond, Meringue / Sandalwood, Vanilla, Musk; oud is not a note). "Eau de Parfum" comes from the Lattafa USA store listing ("Eau de Parfum (EDP) Spray, 100 ML") — lattafa.com itself does not state the concentration. "Floral frutal gourmand" is the store's chosen classification, documented by Fragrantica, **not** published by Lattafa.
