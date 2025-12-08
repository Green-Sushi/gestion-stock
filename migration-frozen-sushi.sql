-- Migration pour créer les tables de gestion de congélation des sushis
-- Cette migration ajoute :
-- 1. Table sushi_types : catalogue des types de sushis pouvant être congelés
-- 2. Table frozen_sushi : historique des congélations avec calcul automatique de la date d'expiration (3 mois)

-- ========================================
-- 1. TABLE SUSHI_TYPES (Catalogue)
-- ========================================

CREATE TABLE IF NOT EXISTS sushi_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('frit', 'vegi', 'duo', 'noel')),
    available_fish TEXT[],
    requires_fish_selection BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. TABLE FROZEN_SUSHI (Historique)
-- ========================================

CREATE TABLE IF NOT EXISTS frozen_sushi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sushi_type_id UUID REFERENCES sushi_types(id) ON DELETE CASCADE,
    fish_type VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    frozen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date DATE GENERATED ALWAYS AS ((frozen_at::date + INTERVAL '3 months')::date) STORED,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. INSERTION DES 9 SUSHIS DU CATALOGUE
-- ========================================

INSERT INTO sushi_types (name, category, available_fish, requires_fish_selection, display_order) VALUES
('Sushi frit', 'frit', ARRAY['Thon', 'Saumon', 'Marlin', 'Crevette'], true, 1),
('Friki''pik', 'frit', ARRAY['Thon', 'Saumon', 'Marlin', 'Crevette'], true, 2),
('Ebi Fish', 'frit', ARRAY['Thon', 'Saumon', 'Marlin'], true, 3),
('Sweet Chesse', 'frit', ARRAY['Thon', 'Saumon', 'Marlin'], true, 4),
('Sushi végi', 'vegi', NULL, false, 5),
('Sushi Skin', 'duo', NULL, false, 6),
('Jambonnette', 'noel', NULL, false, 7),
('Saumonette', 'noel', NULL, false, 8),
('Rilette', 'noel', NULL, false, 9)
ON CONFLICT DO NOTHING;

-- ========================================
-- 4. INDEX POUR PERFORMANCES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_frozen_sushi_type ON frozen_sushi(sushi_type_id);
CREATE INDEX IF NOT EXISTS idx_frozen_sushi_date ON frozen_sushi(frozen_at DESC);
CREATE INDEX IF NOT EXISTS idx_frozen_sushi_user ON frozen_sushi(user_id);
CREATE INDEX IF NOT EXISTS idx_sushi_types_category ON sushi_types(category);

-- ========================================
-- 5. TRIGGER UPDATED_AT
-- ========================================

CREATE TRIGGER update_sushi_types_updated_at BEFORE UPDATE ON sushi_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE sushi_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE frozen_sushi ENABLE ROW LEVEL SECURITY;

-- Politique d'accès public pour tous (car authentification par PIN dans l'app)
CREATE POLICY "Enable all access for all users" ON sushi_types FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON frozen_sushi FOR ALL USING (true);

-- ========================================
-- 7. COMMENTAIRES
-- ========================================

COMMENT ON TABLE sushi_types IS 'Catalogue des types de sushis pouvant être congelés';
COMMENT ON TABLE frozen_sushi IS 'Historique des congélations de sushis';
COMMENT ON COLUMN sushi_types.name IS 'Nom du type de sushi';
COMMENT ON COLUMN sushi_types.category IS 'Catégorie : frit, vegi, duo ou noel';
COMMENT ON COLUMN sushi_types.available_fish IS 'Liste des poissons disponibles pour ce type';
COMMENT ON COLUMN sushi_types.requires_fish_selection IS 'true si l''utilisateur doit choisir un poisson';
COMMENT ON COLUMN sushi_types.display_order IS 'Ordre d''affichage dans l''interface';
COMMENT ON COLUMN frozen_sushi.expiry_date IS 'Date d''expiration calculée automatiquement : frozen_at + 3 mois';
COMMENT ON COLUMN frozen_sushi.fish_type IS 'Type de poisson sélectionné (NULL si non applicable)';
COMMENT ON COLUMN frozen_sushi.quantity IS 'Quantité de sushis congelés';
