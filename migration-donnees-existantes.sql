-- ============================================
-- SCRIPT DE MIGRATION DES DONNÉES EXISTANTES
-- ============================================
-- Ce script adapte vos données existantes au format
-- attendu par l'application Green Sushi
--
-- AVANT D'EXÉCUTER :
-- 1. Exécutez d'abord verification-donnees-existantes.sql
-- 2. Vérifiez que les colonnes correspondent
-- 3. Adaptez ce script si nécessaire
-- ============================================

-- ÉTAPE 1 : Normaliser les catégories
-- L'application attend : 'frais', 'sec', 'surgele', 'consommable', 'boisson'

-- Vérifier les catégories actuelles
SELECT DISTINCT category FROM products;

-- Si vos catégories sont différentes, décommentez et adaptez :
/*
UPDATE products SET category = 'frais' WHERE category IN ('Frais', 'FRAIS', 'Stock Frais');
UPDATE products SET category = 'sec' WHERE category IN ('Sec', 'SEC', 'Stock Sec');
UPDATE products SET category = 'surgele' WHERE category IN ('Surgelé', 'SURGELE', 'Stock Surgelé', 'Surgele');
UPDATE products SET category = 'consommable' WHERE category IN ('Consommable', 'CONSOMMABLE', 'Stock Consommable');
UPDATE products SET category = 'boisson' WHERE category IN ('Boisson', 'BOISSON', 'Stock Boissons', 'Boissons');
*/

-- ÉTAPE 2 : Vérifier que toutes les colonnes nécessaires existent
-- Si une colonne manque, ajoutez-la (décommentez si nécessaire) :

/*
-- Ajouter la colonne alert_threshold si elle n'existe pas
ALTER TABLE products ADD COLUMN IF NOT EXISTS alert_threshold DECIMAL(10, 2) DEFAULT 0;

-- Ajouter la colonne notes si elle n'existe pas
ALTER TABLE products ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ajouter la colonne unit si elle n'existe pas
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'unité';
*/

-- ÉTAPE 3 : Définir des seuils d'alerte par défaut si manquants
-- (décommentez et adaptez selon vos besoins)

/*
-- Mettre les seuils d'alerte à 50% de la quantité actuelle
UPDATE products
SET alert_threshold = quantity * 0.5
WHERE alert_threshold IS NULL OR alert_threshold = 0;

-- Ou définir des seuils fixes par catégorie
UPDATE products SET alert_threshold = 10 WHERE category = 'frais' AND (alert_threshold IS NULL OR alert_threshold = 0);
UPDATE products SET alert_threshold = 20 WHERE category = 'sec' AND (alert_threshold IS NULL OR alert_threshold = 0);
UPDATE products SET alert_threshold = 5 WHERE category = 'surgele' AND (alert_threshold IS NULL OR alert_threshold = 0);
UPDATE products SET alert_threshold = 3 WHERE category = 'consommable' AND (alert_threshold IS NULL OR alert_threshold = 0);
UPDATE products SET alert_threshold = 12 WHERE category = 'boisson' AND (alert_threshold IS NULL OR alert_threshold = 0);
*/

-- ÉTAPE 4 : Créer des fournisseurs par défaut si manquants
-- (décommentez si vous avez des produits sans fournisseur)

/*
-- Créer un fournisseur "Non spécifié" pour les produits sans fournisseur
INSERT INTO suppliers (name, notes)
VALUES ('Non spécifié', 'Fournisseur temporaire pour produits existants')
ON CONFLICT DO NOTHING
RETURNING id;

-- Assigner ce fournisseur aux produits sans fournisseur
UPDATE products
SET supplier_id = (SELECT id FROM suppliers WHERE name = 'Non spécifié')
WHERE supplier_id IS NULL;
*/

-- ÉTAPE 5 : Vérification finale
SELECT
    'Produits par catégorie:' as info,
    category,
    COUNT(*) as nombre
FROM products
GROUP BY category
ORDER BY category;

SELECT
    'Produits avec alerte:' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN alert_threshold > 0 THEN 1 END) as avec_seuil
FROM products;

SELECT
    'Produits avec fournisseur:' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN supplier_id IS NOT NULL THEN 1 END) as avec_fournisseur
FROM products;

-- ÉTAPE 6 : Afficher un aperçu des produits migrés
SELECT
    p.name,
    p.category,
    p.quantity,
    p.unit,
    p.alert_threshold,
    s.name as fournisseur,
    CASE
        WHEN p.quantity <= p.alert_threshold THEN '⚠️ STOCK BAS'
        ELSE '✅ OK'
    END as statut
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id
ORDER BY
    CASE WHEN p.quantity <= p.alert_threshold THEN 0 ELSE 1 END,
    p.category,
    p.name
LIMIT 20;
