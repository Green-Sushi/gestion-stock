-- ============================================
-- SCRIPT DE VÉRIFICATION DES DONNÉES EXISTANTES
-- ============================================
-- Ce script permet de voir la structure actuelle
-- de vos données pour les adapter à l'application
-- ============================================

-- ÉTAPE 1 : Vérifier la structure de la table products
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- ÉTAPE 2 : Afficher quelques produits existants
SELECT
    id,
    name,
    category,
    quantity,
    unit,
    alert_threshold,
    supplier_id,
    created_at
FROM products
LIMIT 10;

-- ÉTAPE 3 : Vérifier les catégories utilisées
SELECT
    category,
    COUNT(*) as nombre_produits
FROM products
GROUP BY category
ORDER BY category;

-- ÉTAPE 4 : Vérifier la structure de la table suppliers
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'suppliers'
ORDER BY ordinal_position;

-- ÉTAPE 5 : Afficher les fournisseurs existants
SELECT
    id,
    name,
    contact_name,
    phone,
    email
FROM suppliers
LIMIT 10;

-- ÉTAPE 6 : Vérifier les produits sans fournisseur
SELECT
    COUNT(*) as produits_sans_fournisseur
FROM products
WHERE supplier_id IS NULL;

-- ÉTAPE 7 : Vérifier les produits avec fournisseur invalide
SELECT
    COUNT(*) as produits_fournisseur_invalide
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.supplier_id IS NOT NULL AND s.id IS NULL;
