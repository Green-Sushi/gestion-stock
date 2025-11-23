-- ============================================
-- SCRIPT DE NETTOYAGE DES DONNÉES D'EXEMPLE
-- ============================================
-- Ce script supprime UNIQUEMENT les données importées
-- via exemple-donnees.sql (produits et fournisseurs)
--
-- ✅ GARDE :
-- - Les utilisateurs (Patron et Employé)
-- - Les paramètres de l'application
-- - La structure de la base de données
--
-- ❌ SUPPRIME :
-- - Tous les produits
-- - Tous les fournisseurs
-- - Les mouvements de stock associés
-- - Les alertes envoyées associées
-- ============================================

-- ÉTAPE 1 : Supprimer les alertes envoyées (liées aux produits)
DELETE FROM sent_alerts;

-- ÉTAPE 2 : Supprimer les mouvements de stock
DELETE FROM stock_movements;

-- ÉTAPE 3 : Supprimer tous les produits
DELETE FROM products;

-- ÉTAPE 4 : Supprimer tous les fournisseurs
DELETE FROM suppliers;

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Afficher ce qui reste dans la base
SELECT 'Utilisateurs restants:' as info, COUNT(*) as total FROM users
UNION ALL
SELECT 'Fournisseurs restants:', COUNT(*) FROM suppliers
UNION ALL
SELECT 'Produits restants:', COUNT(*) FROM products
UNION ALL
SELECT 'Mouvements restants:', COUNT(*) FROM stock_movements
UNION ALL
SELECT 'Paramètres restants:', COUNT(*) FROM app_settings
UNION ALL
SELECT 'Alertes restantes:', COUNT(*) FROM sent_alerts;

-- Lister les utilisateurs qui restent (pour vérifier)
SELECT 'Liste des utilisateurs:' as info, name, role, pin_code FROM users;

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- Utilisateurs restants: 2 (Patron et Employé)
-- Fournisseurs restants: 0
-- Produits restants: 0
-- Mouvements restants: 0
-- Paramètres restants: 4 (email_notifications, email_recipient, whatsapp_notifications, whatsapp_number)
-- Alertes restantes: 0
-- ============================================
