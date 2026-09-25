-- Rollback of v44g-perfumes-content.sql: restores the exact pre-V4.4G values of the two perfumes
-- (captured from the production export of 2026-09-25). Leaves the fragrance_family COLUMN in place (see docs/v44g-perfumes.md).
UPDATE products SET
  name='FRAGRANCE / 001', name_status='provisional', subtitle='Fragrance Edit · Drop 001',
  description='Fragancia de la selección actual.', fragrance_family=NULL, features_json='[]', updated_at=CURRENT_TIMESTAMP
WHERE id='perfume-01' AND slug='ref-temporal-perfume-01';

UPDATE products SET
  name='FRAGRANCE / 002', name_status='provisional', subtitle='Fragrance Edit · Drop 001',
  description='Fragancia de la selección actual.', fragrance_family=NULL, features_json='[]', updated_at=CURRENT_TIMESTAMP
WHERE id='perfume-02' AND slug='ref-temporal-perfume-02';
