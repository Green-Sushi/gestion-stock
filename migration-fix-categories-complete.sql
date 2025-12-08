-- Migration complète: Correction des catégories + ajout 'autre'
-- À exécuter dans le SQL Editor de Supabase
-- ORDRE IMPORTANT : Supprimer contrainte AVANT de modifier les données

-- ÉTAPE 1: Supprimer l'ancienne contrainte qui bloque les modifications
ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_category_check;

-- ÉTAPE 2: Corriger les données existantes (singulier -> pluriel)
UPDATE products
SET category = 'consommables'
WHERE category = 'consommable';

UPDATE products
SET category = 'boissons'
WHERE category = 'boisson';

-- ÉTAPE 3: Ajouter la nouvelle contrainte avec toutes les catégories
ALTER TABLE products
ADD CONSTRAINT products_category_check
CHECK (category IN ('frais', 'sec', 'surgele', 'consommables', 'boissons', 'autre'));

-- ÉTAPE 4: Vérification (optionnel - affiche les catégories distinctes)
-- SELECT DISTINCT category FROM products ORDER BY category;
