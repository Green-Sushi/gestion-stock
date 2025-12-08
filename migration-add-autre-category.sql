-- Migration: Ajout de la catégorie 'autre' dans la table products
-- À exécuter dans le SQL Editor de Supabase

-- Supprimer l'ancienne contrainte
ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_category_check;

-- Ajouter la nouvelle contrainte avec 'autre'
ALTER TABLE products
ADD CONSTRAINT products_category_check
CHECK (category IN ('frais', 'sec', 'surgele', 'consommables', 'boissons', 'autre'));
