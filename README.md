# Premium Streetwear + Perfume Commerce — V1

Primera versión real del storefront creada con fotografía real del cliente y arquitectura preparada para evolucionar hacia Shopify Headless.

## V1 funcional
- Home editorial con dirección fashion/streetwear.
- Catálogo con filtros por categoría.
- Product Detail con galería, variantes y guía de tallas.
- Carrito custom tipo drawer.
- `/admin` como CMS controlado V1.
- Modelo Product / Variant / Media con campos Shopify-ready.
- Responsive específico para móvil.
- Motion system y `prefers-reduced-motion`.
- Configuración de Cloudflare Workers para static assets.
- GitHub Actions preparado para desplegar a Cloudflare sobre el mismo proyecto.

## Datos no inventados
Los nombres, precios, SKU, stock y parte de la información comercial siguen marcados como pendientes cuando el cliente no los ha confirmado.

## Assets
La V1 referencia una selección de fotografías reales del Drive del cliente mediante sus Drive file IDs. En la ronda de backend/media definitiva deben migrarse a un CDN administrable como Cloudflare R2 o Shopify CDN sin cambiar el modelo del storefront.

## Local
```bash
npm install
npm run build
npm test
```

## Cloudflare
```bash
npm run deploy
```

El workflow `.github/workflows/cloudflare-deploy.yml` despliega en pushes a `main` una vez configurados:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Arquitectura
Custom Storefront → Controlled CMS/Data Layer → Shopify Commerce Layer → Shopify Checkout

V1 no es una demo desechable. Las siguientes rondas deben evolucionar este mismo repositorio y este mismo deployment.
