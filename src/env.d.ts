/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_PREVIEW_NOINDEX?: string
  readonly VITE_COMMERCE_PROVIDER?: 'preview' | 'shopify'
  readonly VITE_SHOPIFY_STOREFRONT_DOMAIN?: string
  readonly VITE_SHOPIFY_STOREFRONT_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
