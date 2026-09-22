INSERT OR IGNORE INTO categories(id,slug,name,enabled,sort_order) VALUES
('cat-jeans','jeans','Jeans',1,1),
('cat-streetwear','streetwear','Streetwear',1,2),
('cat-sets','conjuntos','Conjuntos',1,3),
('cat-perfume','perfumes','Perfumes',1,4);

INSERT OR IGNORE INTO fits(id,slug,name,enabled,sort_order) VALUES
('fit-flared','flared-fit','Flared Fit',1,1),
('fit-oversized','oversized','Oversized',1,2),
('fit-regular','regular','Regular',1,3);

INSERT OR IGNORE INTO collections(id,slug,name,enabled,sort_order) VALUES
('col-drop','drop-001','Drop 001',1,1),
('col-denim','denim','Denim',1,2),
('col-graphic','graphic','Graphic',1,3),
('col-fragrance','fragrance-edit','Fragrance Edit',1,4),
('col-technical','technical','Technical',1,5);

INSERT OR IGNORE INTO products(id,slug,name,name_status,subtitle,description,category_id,fit,color,featured,best_seller,new_arrival,status,sort_order,features_json) VALUES
('denim-01','ref-temporal-denim-01','DENIM / 001','provisional','Flared Fit · Denim','Denim de estructura sólida con silueta amplia y caída definida.','cat-jeans','Flared Fit','Blue',1,1,1,'active',1,'["Corte Flared Fit con pierna acampanada que aporta una silueta amplia y definida.","Denim de estructura sólida, con un calce amplio y una caída cuidadosamente definida.","Tratamiento de lavado acompañado de detalles estéticos que resaltan el carácter de la prenda.","Streetwear premium con estética moderna y gran presencia visual."]'),
('denim-02','ref-temporal-denim-02','DENIM / 002','provisional','Flared Fit · Grey Denim','Denim gris con silueta amplia y acabado lavado.','cat-jeans','Flared Fit','Grey',1,0,1,'active',2,'["Corte Flared Fit con pierna acampanada que aporta una silueta amplia y definida.","Denim de estructura sólida, con un calce amplio y una caída cuidadosamente definida.","Tratamiento de lavado acompañado de detalles estéticos que resaltan el carácter de la prenda.","Streetwear premium con estética moderna y gran presencia visual."]'),
('tee-01','ref-temporal-tee-01','TEE / 001','provisional','Oversized · Graphic','Camiseta gráfica de silueta amplia para looks streetwear.','cat-streetwear','Oversized','Multi',1,1,0,'active',3,'[]'),
('set-01','ref-temporal-set-01','SET / 001','provisional','Regular Fit · Black Set','Conjunto negro de la selección actual.','cat-sets','Regular','Black',1,0,1,'active',4,'[]'),
('perfume-01','ref-temporal-perfume-01','FRAGRANCE / 001','provisional','Fragrance Edit · Drop 001','Fragancia de la selección actual.','cat-perfume',NULL,'Pink',1,1,1,'active',5,'[]'),
('perfume-02','ref-temporal-perfume-02','FRAGRANCE / 002','provisional','Fragrance Edit · Drop 001','Fragancia de la selección actual.','cat-perfume',NULL,'Pink',0,1,0,'active',6,'[]');

INSERT OR IGNORE INTO variants(id,product_id,size,available,sort_order) VALUES
('denim-01-30','denim-01','30',1,1),('denim-01-32','denim-01','32',1,2),('denim-01-34','denim-01','34',1,3),('denim-01-36','denim-01','36',1,4),('denim-01-38','denim-01','38',1,5),
('denim-02-30','denim-02','30',1,1),('denim-02-32','denim-02','32',1,2),('denim-02-34','denim-02','34',1,3),('denim-02-36','denim-02','36',1,4),('denim-02-38','denim-02','38',1,5),
('tee-01-S','tee-01','S',1,1),('tee-01-M','tee-01','M',1,2),('tee-01-L','tee-01','L',1,3),('tee-01-XL','tee-01','XL',1,4),
('set-01-S','set-01','S',1,1),('set-01-M','set-01','M',1,2),('set-01-L','set-01','L',1,3),('set-01-XL','set-01','XL',1,4),
('perfume-01-u','perfume-01','Única',1,1),('perfume-02-u','perfume-02','Única',1,1);

INSERT OR IGNORE INTO product_media(id,product_id,media_type,public_url,alt,sort_order) VALUES
('denim-01-hero','denim-01','hero','https://lh3.googleusercontent.com/d/1ONkU3pMbdhFziTHc4NE0mWXmV7dPRNOy=w1600','Jean denim distressed real del cliente',1),
('denim-02-hero','denim-02','hero','https://lh3.googleusercontent.com/d/1VcVp_UIGeR7h-R2E4R7v0FFeRACr1dfy=w1600','Jean gris flared real del cliente',1),
('tee-01-hero','tee-01','hero','https://lh3.googleusercontent.com/d/1ev3sMqVwP681ERFoHIpbXRSo6CRG7Lpc=w1600','Camisetas gráficas reales del cliente',1),
('set-01-hero','set-01','hero','https://lh3.googleusercontent.com/d/1W73W8kxkeOnYYtx08XVEzA4kSQHHSbiI=w1600','Conjunto negro real del cliente',1),
('perfume-01-hero','perfume-01','hero','https://lh3.googleusercontent.com/d/1_YiU7Bu_rHnrJ96HkdXhblauYbRzi9oA=w1600','Perfume real del cliente en composición floral',1),
('perfume-02-hero','perfume-02','hero','https://lh3.googleusercontent.com/d/1Ajd0-B_hF0YT2MR8dxUuFFsYqgTtCPuy=w1600','Perfume real del cliente sobre flores',1);

INSERT OR IGNORE INTO product_collections(product_id,collection_id) VALUES
('denim-01','col-drop'),('denim-01','col-denim'),('denim-02','col-drop'),('denim-02','col-denim'),
('tee-01','col-drop'),('tee-01','col-graphic'),('set-01','col-drop'),('set-01','col-technical'),
('perfume-01','col-drop'),('perfume-01','col-fragrance'),('perfume-02','col-drop'),('perfume-02','col-fragrance');

INSERT OR IGNORE INTO homepage_settings(id,hero_product_id,hero_secondary_product_id,hero_headline,hero_subheadline,featured_product_ids_json,fragrance_primary_id,fragrance_secondary_id,editorial_product_id,editorial_image_url) VALUES
('default','denim-02','denim-01','DROP / 001
DENIM + STREETWEAR','Jeans, prendas streetwear y fragancias del drop actual.','["denim-01","tee-01","denim-02","set-01"]','perfume-01','perfume-02','tee-01','https://lh3.googleusercontent.com/d/1odcYeVgo-dTFamzSyLZoX0FbnsCJBuiR=w1600');

INSERT OR IGNORE INTO site_settings(id,brand_name,logo_url,instagram,whatsapp,email,shipping_copy,changes_copy,advisory_copy,store_status,shopify_enabled,preview_noindex) VALUES
('default',NULL,NULL,NULL,NULL,NULL,'La cobertura, el costo y los tiempos de envío se confirmarán según el destino.','La prenda debe regresar sin uso, manchas, daños, modificaciones u olores, con etiquetas y elementos originales.','Si estás entre dos tallas, compara las medidas con una prenda propia cuyo fit te guste antes de elegir.','preview',0,1);
