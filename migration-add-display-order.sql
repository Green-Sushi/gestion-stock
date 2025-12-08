-- Migration pour ajouter le champ display_order aux produits
-- Permet d'organiser l'ordre d'affichage des produits

-- Ajouter la colonne display_order
ALTER TABLE products
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Initialiser l'ordre pour les produits existants (par ordre alphabétique)
WITH ordered_products AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name) as row_num
    FROM products
)
UPDATE products
SET display_order = ordered_products.row_num
FROM ordered_products
WHERE products.id = ordered_products.id AND products.display_order = 0;

-- Créer un index pour améliorer les performances de tri
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);

-- Commentaire
COMMENT ON COLUMN products.display_order IS 'Ordre d''affichage personnalisé des produits';
