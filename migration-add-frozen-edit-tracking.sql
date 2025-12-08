-- Migration: Ajout de colonnes de traçabilité pour l'édition des sushis congelés
-- Date: 2025-12-08
-- Description: Ajoute updated_at et updated_by pour permettre l'édition avec traçabilité

-- ========================================
-- 1. AJOUT DES COLONNES
-- ========================================

-- Ajouter la colonne updated_at (date de dernière modification)
ALTER TABLE frozen_sushi
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Ajouter la colonne updated_by (utilisateur ayant fait la dernière modification)
ALTER TABLE frozen_sushi
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ========================================
-- 2. COMMENTAIRES
-- ========================================

COMMENT ON COLUMN frozen_sushi.updated_at IS 'Date et heure de la dernière modification (NULL si jamais modifié)';
COMMENT ON COLUMN frozen_sushi.updated_by IS 'Utilisateur ayant effectué la dernière modification (NULL si jamais modifié)';

-- ========================================
-- 3. INDEX POUR PERFORMANCE
-- ========================================

-- Index sur updated_at pour filtrer/trier par date de modification
CREATE INDEX IF NOT EXISTS idx_frozen_sushi_updated_at ON frozen_sushi(updated_at);

-- Index sur updated_by pour rechercher les modifications par utilisateur
CREATE INDEX IF NOT EXISTS idx_frozen_sushi_updated_by ON frozen_sushi(updated_by);

-- ========================================
-- 4. VALIDATION
-- ========================================

-- Afficher la structure de la table après modification
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'frozen_sushi'
ORDER BY ordinal_position;
