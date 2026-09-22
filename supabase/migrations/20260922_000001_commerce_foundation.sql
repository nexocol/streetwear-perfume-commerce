create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fits (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_status text not null default 'provisional',
  subtitle text,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  fit text,
  color text,
  price numeric(12,2),
  compare_at_price numeric(12,2),
  featured boolean not null default false,
  best_seller boolean not null default false,
  new_arrival boolean not null default false,
  status text not null default 'draft' check (status in ('draft','active','hidden','archived')),
  sort_order integer not null default 0,
  features text[] not null default '{}',
  shopify_product_id text,
  shopify_handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color text,
  sku text,
  price numeric(12,2),
  stock integer,
  available boolean not null default true,
  shopify_variant_id text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_type text not null check (media_type in ('hero','front','back','detail','model','editorial','thumbnail')),
  storage_path text,
  public_url text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_collections (
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

create table if not exists public.homepage_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  hero_product_id uuid references public.products(id) on delete set null,
  hero_secondary_product_id uuid references public.products(id) on delete set null,
  hero_headline text not null default 'DROP / 001' || chr(10) || 'DENIM + STREETWEAR',
  hero_subheadline text not null default '',
  featured_product_ids uuid[] not null default '{}',
  fragrance_primary_id uuid references public.products(id) on delete set null,
  fragrance_secondary_id uuid references public.products(id) on delete set null,
  editorial_product_id uuid references public.products(id) on delete set null,
  editorial_image_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  brand_name text,
  logo_url text,
  instagram text,
  whatsapp text,
  email text,
  shipping_copy text,
  changes_copy text,
  advisory_copy text,
  store_status text not null default 'preview',
  shopify_enabled boolean not null default false,
  preview_noindex boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger fits_updated_at before update on public.fits for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger variants_updated_at before update on public.variants for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger homepage_settings_updated_at before update on public.homepage_settings for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

create index if not exists products_status_sort_idx on public.products(status, sort_order);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists variants_product_idx on public.variants(product_id, sort_order);
create index if not exists media_product_idx on public.product_media(product_id, sort_order);
create index if not exists product_collections_collection_idx on public.product_collections(collection_id);

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.fits enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.product_media enable row level security;
alter table public.product_collections enable row level security;
alter table public.homepage_settings enable row level security;
alter table public.site_settings enable row level security;

create policy "admin_users_self_read" on public.admin_users for select to authenticated using ((select auth.uid()) = user_id);

create policy "categories_public_read" on public.categories for select to anon, authenticated using (enabled or (select private.is_admin()));
create policy "fits_public_read" on public.fits for select to anon, authenticated using (enabled or (select private.is_admin()));
create policy "collections_public_read" on public.collections for select to anon, authenticated using (enabled or (select private.is_admin()));
create policy "products_public_read" on public.products for select to anon, authenticated using (status='active' or (select private.is_admin()));
create policy "variants_public_read" on public.variants for select to anon, authenticated using (exists(select 1 from public.products p where p.id=product_id and (p.status='active' or (select private.is_admin()))));
create policy "media_public_read" on public.product_media for select to anon, authenticated using (exists(select 1 from public.products p where p.id=product_id and (p.status='active' or (select private.is_admin()))));
create policy "product_collections_public_read" on public.product_collections for select to anon, authenticated using (exists(select 1 from public.products p where p.id=product_id and (p.status='active' or (select private.is_admin()))));
create policy "homepage_public_read" on public.homepage_settings for select to anon, authenticated using (true);
create policy "site_public_read" on public.site_settings for select to anon, authenticated using (true);

create policy "categories_admin_insert" on public.categories for insert to authenticated with check ((select private.is_admin()));
create policy "categories_admin_update" on public.categories for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "categories_admin_delete" on public.categories for delete to authenticated using ((select private.is_admin()));
create policy "fits_admin_insert" on public.fits for insert to authenticated with check ((select private.is_admin()));
create policy "fits_admin_update" on public.fits for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "fits_admin_delete" on public.fits for delete to authenticated using ((select private.is_admin()));
create policy "collections_admin_insert" on public.collections for insert to authenticated with check ((select private.is_admin()));
create policy "collections_admin_update" on public.collections for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "collections_admin_delete" on public.collections for delete to authenticated using ((select private.is_admin()));
create policy "products_admin_insert" on public.products for insert to authenticated with check ((select private.is_admin()));
create policy "products_admin_update" on public.products for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "products_admin_delete" on public.products for delete to authenticated using ((select private.is_admin()));
create policy "variants_admin_insert" on public.variants for insert to authenticated with check ((select private.is_admin()));
create policy "variants_admin_update" on public.variants for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "variants_admin_delete" on public.variants for delete to authenticated using ((select private.is_admin()));
create policy "media_admin_insert" on public.product_media for insert to authenticated with check ((select private.is_admin()));
create policy "media_admin_update" on public.product_media for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "media_admin_delete" on public.product_media for delete to authenticated using ((select private.is_admin()));
create policy "product_collections_admin_insert" on public.product_collections for insert to authenticated with check ((select private.is_admin()));
create policy "product_collections_admin_update" on public.product_collections for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "product_collections_admin_delete" on public.product_collections for delete to authenticated using ((select private.is_admin()));
create policy "homepage_admin_insert" on public.homepage_settings for insert to authenticated with check ((select private.is_admin()));
create policy "homepage_admin_update" on public.homepage_settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "homepage_admin_delete" on public.homepage_settings for delete to authenticated using ((select private.is_admin()));
create policy "site_admin_insert" on public.site_settings for insert to authenticated with check ((select private.is_admin()));
create policy "site_admin_update" on public.site_settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "site_admin_delete" on public.site_settings for delete to authenticated using ((select private.is_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-media','product-media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('site-assets','site-assets',true,5242880,array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "product_media_storage_public_read" on storage.objects for select to public using (bucket_id='product-media');
create policy "product_media_storage_admin_insert" on storage.objects for insert to authenticated with check (bucket_id='product-media' and (select private.is_admin()));
create policy "product_media_storage_admin_update" on storage.objects for update to authenticated using (bucket_id='product-media' and (select private.is_admin())) with check (bucket_id='product-media' and (select private.is_admin()));
create policy "product_media_storage_admin_delete" on storage.objects for delete to authenticated using (bucket_id='product-media' and (select private.is_admin()));
create policy "site_assets_storage_public_read" on storage.objects for select to public using (bucket_id='site-assets');
create policy "site_assets_storage_admin_insert" on storage.objects for insert to authenticated with check (bucket_id='site-assets' and (select private.is_admin()));
create policy "site_assets_storage_admin_update" on storage.objects for update to authenticated using (bucket_id='site-assets' and (select private.is_admin())) with check (bucket_id='site-assets' and (select private.is_admin()));
create policy "site_assets_storage_admin_delete" on storage.objects for delete to authenticated using (bucket_id='site-assets' and (select private.is_admin()));

insert into public.homepage_settings(singleton) values(true) on conflict(singleton) do nothing;
insert into public.site_settings(singleton) values(true) on conflict(singleton) do nothing;
