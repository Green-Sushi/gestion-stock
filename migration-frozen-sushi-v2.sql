-- Migration: Création de frozen_sushi_v2 avec support d'édition
-- Date: 2025-12-08
-- Description: Nouvelle table avec colonnes updated_at et updated_by dès le départ

-- ========================================
-- 1. CRÉATION DE LA TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS frozen_sushi_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sushi_type_id UUID REFERENCES sushi_types(id) ON DELETE CASCADE,
    fish_type VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    frozen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date DATE GENERATED ALWAYS AS ((frozen_at::date + INTERVAL '3 months')::date) STORED,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ========================================
-- 2. COMMENTAIRES
-- ========================================

COMMENT ON TABLE frozen_sushi_v2 IS 'Suivi des sushis congelés (version 2 avec édition)';
COMMENT ON COLUMN frozen_sushi_v2.id IS 'Identifiant unique';
COMMENT ON COLUMN frozen_sushi_v2.sushi_type_id IS 'Type de sushi congelé';
COMMENT ON COLUMN frozen_sushi_v2.fish_type IS 'Type de poisson (si applicable)';
COMMENT ON COLUMN frozen_sushi_v2.quantity IS 'Quantité congelée';
COMMENT ON COLUMN frozen_sushi_v2.frozen_at IS 'Date et heure de congélation';
COMMENT ON COLUMN frozen_sushi_v2.expiry_date IS 'Date d''expiration (3 mois après congélation)';
COMMENT ON COLUMN frozen_sushi_v2.user_id IS 'Utilisateur ayant congelé (auteur original)';
COMMENT ON COLUMN frozen_sushi_v2.created_at IS 'Date de création de l''entrée';
COMMENT ON COLUMN frozen_sushi_v2.updated_at IS 'Date de dernière modification (NULL si jamais modifié)';
COMMENT ON COLUMN frozen_sushi_v2.updated_by IS 'Utilisateur ayant fait la dernière modification (NULL si jamais modifié)';

-- ========================================
-- 3. INDEX POUR PERFORMANCE
-- ========================================

-- Index sur frozen_at pour tri et filtrage par date
CREATE INDEX IF NOT EXISTS idx_frozen_sushi_v2_frozen_at ON frozen_sushi_v2(frozen_at);

-- Index sur sushi_type_id pour filtrage par type
CREATE INDEX IF NOT EXISTS idx_frozen_sushi_v2_sushi_type ON frozen_sushi_v2(sushi_type_id);

-- Index sur user_id pour filtrage par utilisateur
CREATE INDEX IF NOT EXISTS idx_frozen_sushi_v2_user_id ON frozen_sushi_v2(user_id);

-- Index sur updated_at pour filtrer/trier par date de modification
CREATE INDEX IF NOT EXISTS idx_frozen_sushi_v2_updated_at ON frozen_sushi_v2(updated_at);

-- Index sur updated_by pour rechercher les modifications par utilisateur
CREATE INDEX IF NOT EXISTS idx_frozen_sushi_v2_updated_by ON frozen_sushi_v2(updated_by);

-- ========================================
-- 4. RLS (Row Level Security)
-- ========================================

-- Activer RLS
ALTER TABLE frozen_sushi_v2 ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut lire
CREATE POLICY "Tous peuvent lire frozen_sushi_v2"
    ON frozen_sushi_v2
    FOR SELECT
    USING (true);

-- Politique: Utilisateurs authentifiés peuvent insérer
CREATE POLICY "Utilisateurs authentifiés peuvent insérer frozen_sushi_v2"
    ON frozen_sushi_v2
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Politique: Utilisateurs authentifiés peuvent mettre à jour
CREATE POLICY "Utilisateurs authentifiés peuvent mettre à jour frozen_sushi_v2"
    ON frozen_sushi_v2
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Politique: Utilisateurs authentifiés peuvent supprimer
CREATE POLICY "Utilisateurs authentifiés peuvent supprimer frozen_sushi_v2"
    ON frozen_sushi_v2
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ========================================
-- 5. VALIDATION
-- ========================================

-- Afficher la structure de la table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'frozen_sushi_v2'
ORDER BY ordinal_position;
