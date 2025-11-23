-- Migration: Ajout du champ optimal_stock à la table products
-- Pour le système multi-seuils (4 niveaux: vert/jaune/orange/rouge)
-- À exécuter dans le SQL Editor de Supabase

-- Ajouter la colonne optimal_stock
ALTER TABLE products
ADD COLUMN IF NOT EXISTS optimal_stock DECIMAL(10, 2);

-- Mettre à jour les produits existants avec une valeur par défaut
-- optimal_stock = alert_threshold × 4 (pour avoir un bon écart entre les seuils)
UPDATE products
SET optimal_stock = alert_threshold * 4
WHERE optimal_stock IS NULL;

-- Optionnel: Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN products.optimal_stock IS 'Stock optimal recommandé pour le produit (utilisé pour calcul niveau jaune)';
