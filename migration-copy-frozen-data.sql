-- Migration: Copie des données de frozen_sushi vers frozen_sushi_v2
-- Date: 2025-12-08
-- Description: Migration des données existantes vers la nouvelle table
-- IMPORTANT: Exécuter APRÈS avoir créé frozen_sushi_v2 et testé le code

-- ========================================
-- 1. VÉRIFICATION PRÉ-MIGRATION
-- ========================================

-- Compter les entrées dans l'ancienne table
SELECT 'Entrées dans frozen_sushi:' AS info, COUNT(*) AS count FROM frozen_sushi;

-- Compter les entrées dans la nouvelle table (devrait être 0 avant migration)
SELECT 'Entrées dans frozen_sushi_v2:' AS info, COUNT(*) AS count FROM frozen_sushi_v2;

-- ========================================
-- 2. COPIE DES DONNÉES
-- ========================================

-- Copier toutes les données de frozen_sushi vers frozen_sushi_v2
INSERT INTO frozen_sushi_v2 (
    id,
    sushi_type_id,
    fish_type,
    quantity,
    frozen_at,
    user_id,
    created_at
)
SELECT
    id,
    sushi_type_id,
    fish_type,
    quantity,
    frozen_at,
    user_id,
    created_at
FROM frozen_sushi;

-- ========================================
-- 3. VÉRIFICATION POST-MIGRATION
-- ========================================

-- Vérifier que le nombre d'entrées correspond
SELECT 'Entrées copiées dans frozen_sushi_v2:' AS info, COUNT(*) AS count FROM frozen_sushi_v2;

-- Vérifier quelques exemples
SELECT
    id,
    sushi_type_id,
    quantity,
    frozen_at,
    created_at
FROM frozen_sushi_v2
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 4. OPTIONNEL: SUPPRESSION ANCIENNE TABLE
-- ========================================

-- ATTENTION: Ne pas exécuter cette partie avant d'avoir vérifié que tout fonctionne !
-- Une fois que frozen_sushi_v2 fonctionne en production:
-- DROP TABLE IF EXISTS frozen_sushi CASCADE;
