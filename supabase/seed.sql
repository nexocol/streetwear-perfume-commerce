insert into public.categories(slug,name,enabled,sort_order) values
('jeans','Jeans',true,1),('streetwear','Streetwear',true,2),('conjuntos','Conjuntos',true,3),('perfumes','Perfumes',true,4)
on conflict(slug) do update set name=excluded.name,enabled=excluded.enabled,sort_order=excluded.sort_order;

insert into public.fits(slug,name,enabled,sort_order) values
('flared-fit','Flared Fit',true,1),('oversized','Oversized',true,2),('regular','Regular',true,3)
on conflict(slug) do update set name=excluded.name,enabled=excluded.enabled,sort_order=excluded.sort_order;

insert into public.collections(slug,name,enabled,sort_order) values
('drop-001','Drop 001',true,1),('denim','Denim',true,2),('graphic','Graphic',true,3),('fragrance-edit','Fragrance Edit',true,4),('technical','Technical',true,5)
on conflict(slug) do update set name=excluded.name,enabled=excluded.enabled,sort_order=excluded.sort_order;

insert into public.products(slug,name,name_status,subtitle,description,category_id,fit,color,featured,best_seller,new_arrival,status,sort_order,features)
values
('ref-temporal-denim-01','DENIM / 001','provisional','Flared Fit · Denim','Denim de estructura sólida con silueta amplia y caída definida.',(select id from public.categories where slug='jeans'),'Flared Fit','Blue',true,true,true,'active',1,array['Corte Flared Fit con pierna acampanada que aporta una silueta amplia y definida.','Denim de estructura sólida, con un calce amplio y una caída cuidadosamente definida.','Tratamiento de lavado acompañado de detalles estéticos que resaltan el carácter de la prenda.','Streetwear premium con estética moderna y gran presencia visual.']),
('ref-temporal-denim-02','DENIM / 002','provisional','Flared Fit · Grey Denim','Denim gris con silueta amplia y acabado lavado.',(select id from public.categories where slug='jeans'),'Flared Fit','Grey',true,false,true,'active',2,array['Corte Flared Fit con pierna acampanada que aporta una silueta amplia y definida.','Denim de estructura sólida, con un calce amplio y una caída cuidadosamente definida.','Tratamiento de lavado acompañado de detalles estéticos que resaltan el carácter de la prenda.','Streetwear premium con estética moderna y gran presencia visual.']),
('ref-temporal-tee-01','TEE / 001','provisional','Oversized · Graphic','Camiseta gráfica de silueta amplia para looks streetwear.',(select id from public.categories where slug='streetwear'),'Oversized','Multi',true,true,false,'active',3,'{}'),
('ref-temporal-set-01','SET / 001','provisional','Regular Fit · Black Set','Conjunto negro de la selección actual.',(select id from public.categories where slug='conjuntos'),'Regular','Black',true,false,true,'active',4,'{}'),
('ref-temporal-perfume-01','FRAGRANCE / 001','provisional','Fragrance Edit · Drop 001','Fragancia de la selección actual.',(select id from public.categories where slug='perfumes'),null,'Pink',true,true,true,'active',5,'{}'),
('ref-temporal-perfume-02','FRAGRANCE / 002','provisional','Fragrance Edit · Drop 001','Fragancia de la selección actual.',(select id from public.categories where slug='perfumes'),null,'Pink',false,true,false,'active',6,'{}')
on conflict(slug) do update set name=excluded.name,name_status=excluded.name_status,subtitle=excluded.subtitle,description=excluded.description,category_id=excluded.category_id,fit=excluded.fit,color=excluded.color,featured=excluded.featured,best_seller=excluded.best_seller,new_arrival=excluded.new_arrival,status=excluded.status,sort_order=excluded.sort_order,features=excluded.features;

delete from public.variants where product_id in (select id from public.products where slug like 'ref-temporal-%');
insert into public.variants(product_id,size,available,sort_order)
select p.id,v.size,true,v.ord from public.products p join (values
('ref-temporal-denim-01','30',1),('ref-temporal-denim-01','32',2),('ref-temporal-denim-01','34',3),('ref-temporal-denim-01','36',4),('ref-temporal-denim-01','38',5),
('ref-temporal-denim-02','30',1),('ref-temporal-denim-02','32',2),('ref-temporal-denim-02','34',3),('ref-temporal-denim-02','36',4),('ref-temporal-denim-02','38',5),
('ref-temporal-tee-01','S',1),('ref-temporal-tee-01','M',2),('ref-temporal-tee-01','L',3),('ref-temporal-tee-01','XL',4),
('ref-temporal-set-01','S',1),('ref-temporal-set-01','M',2),('ref-temporal-set-01','L',3),('ref-temporal-set-01','XL',4),
('ref-temporal-perfume-01','Única',1),('ref-temporal-perfume-02','Única',1)
) as v(slug,size,ord) on p.slug=v.slug;

delete from public.product_media where product_id in (select id from public.products where slug like 'ref-temporal-%');
insert into public.product_media(product_id,media_type,storage_path,public_url,alt,sort_order)
select p.id,'hero',null,m.url,m.alt,1 from public.products p join (values
('ref-temporal-denim-01','https://lh3.googleusercontent.com/d/1ONkU3pMbdhFziTHc4NE0mWXmV7dPRNOy=w1600','Jean denim distressed real del cliente'),
('ref-temporal-denim-02','https://lh3.googleusercontent.com/d/1VcVp_UIGeR7h-R2E4R7v0FFeRACr1dfy=w1600','Jean gris flared real del cliente'),
('ref-temporal-tee-01','https://lh3.googleusercontent.com/d/1ev3sMqVwP681ERFoHIpbXRSo6CRG7Lpc=w1600','Camisetas gráficas reales del cliente'),
('ref-temporal-set-01','https://lh3.googleusercontent.com/d/1W73W8kxkeOnYYtx08XVEzA4kSQHHSbiI=w1600','Conjunto negro real del cliente'),
('ref-temporal-perfume-01','https://lh3.googleusercontent.com/d/1_YiU7Bu_rHnrJ96HkdXhblauYbRzi9oA=w1600','Perfume real del cliente en composición floral'),
('ref-temporal-perfume-02','https://lh3.googleusercontent.com/d/1Ajd0-B_hF0YT2MR8dxUuFFsYqgTtCPuy=w1600','Perfume real del cliente sobre flores')
) as m(slug,url,alt) on p.slug=m.slug;

delete from public.product_collections where product_id in (select id from public.products where slug like 'ref-temporal-%');
insert into public.product_collections(product_id,collection_id)
select p.id,c.id from public.products p join (values
('ref-temporal-denim-01','drop-001'),('ref-temporal-denim-01','denim'),
('ref-temporal-denim-02','drop-001'),('ref-temporal-denim-02','denim'),
('ref-temporal-tee-01','drop-001'),('ref-temporal-tee-01','graphic'),
('ref-temporal-set-01','drop-001'),('ref-temporal-set-01','technical'),
('ref-temporal-perfume-01','drop-001'),('ref-temporal-perfume-01','fragrance-edit'),
('ref-temporal-perfume-02','drop-001'),('ref-temporal-perfume-02','fragrance-edit')
) as x(product_slug,collection_slug) on p.slug=x.product_slug join public.collections c on c.slug=x.collection_slug;

update public.homepage_settings set
hero_product_id=(select id from public.products where slug='ref-temporal-denim-02'),
hero_secondary_product_id=(select id from public.products where slug='ref-temporal-denim-01'),
hero_headline='DROP / 001'||chr(10)||'DENIM + STREETWEAR',
hero_subheadline='Jeans, prendas streetwear y fragancias del drop actual.',
featured_product_ids=array[
  (select id from public.products where slug='ref-temporal-denim-01'),
  (select id from public.products where slug='ref-temporal-tee-01'),
  (select id from public.products where slug='ref-temporal-denim-02'),
  (select id from public.products where slug='ref-temporal-set-01')
],
fragrance_primary_id=(select id from public.products where slug='ref-temporal-perfume-01'),
fragrance_secondary_id=(select id from public.products where slug='ref-temporal-perfume-02'),
editorial_product_id=(select id from public.products where slug='ref-temporal-tee-01'),
editorial_image_url='https://lh3.googleusercontent.com/d/1odcYeVgo-dTFamzSyLZoX0FbnsCJBuiR=w1600';

update public.site_settings set
brand_name=null,logo_url=null,instagram=null,whatsapp=null,email=null,
shipping_copy='La cobertura, el costo y los tiempos de envío se confirmarán según el destino.',
changes_copy='La prenda debe regresar sin uso, manchas, daños, modificaciones u olores, con etiquetas y elementos originales.',
advisory_copy='Si estás entre dos tallas, compara las medidas con una prenda propia cuyo fit te guste antes de elegir.',
store_status='preview',shopify_enabled=false,preview_noindex=true;
