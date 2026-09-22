# Architecture V1

## Storefront
Rutas SPA: `/`, `/shop`, `/product/:slug`, `/admin`.

El storefront controla dirección de arte, discovery, presentación de producto, navegación, motion y cart UX.

## Data/CMS
El modelo contempla Product, Variant, Media, collections, fit, merchandising flags y Shopify mapping.
El admin V1 es deliberadamente controlado: permite evolucionar contenido sin exponer layout, spacing, tipografía o motion.

## Commerce layer
La siguiente ronda debe reemplazar la persistencia local por un repositorio real con Supabase y/o Shopify APIs sin desechar el storefront.

Shopify debe terminar siendo responsable de checkout, pagos, órdenes, descuentos, inventario y variantes canónicas.

## Cloudflare
`wrangler.jsonc` publica `dist/` como static assets con fallback SPA.
El flujo deseado es GitHub → build → Cloudflare → QA, siempre sobre el mismo proyecto.
