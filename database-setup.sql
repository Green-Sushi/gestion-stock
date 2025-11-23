-- Script d'initialisation de la base de données Supabase
-- À exécuter dans le SQL Editor de Supabase

-- Table des utilisateurs (PIN)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    pin_code VARCHAR(6) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patron', 'employe')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des fournisseurs
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('frais', 'sec', 'surgele', 'consommables', 'boissons')),
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    alert_threshold DECIMAL(10, 2) NOT NULL DEFAULT 0,
    optimal_stock DECIMAL(10, 2),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des paramètres de l'application
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de l'historique des mouvements de stock
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entree', 'sortie', 'ajustement')),
    quantity_before DECIMAL(10, 2) NOT NULL,
    quantity_after DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des alertes envoyées (pour éviter les doublons)
CREATE TABLE IF NOT EXISTS sent_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('email', 'whatsapp')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, alert_type, sent_at)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at DESC);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertion d'un utilisateur patron par défaut (PIN: 123456)
INSERT INTO users (name, pin_code, role)
VALUES ('Patron', '123456', 'patron')
ON CONFLICT (pin_code) DO NOTHING;

-- Insertion d'un employé par défaut (PIN: 000000)
INSERT INTO users (name, pin_code, role)
VALUES ('Employé', '000000', 'employe')
ON CONFLICT (pin_code) DO NOTHING;

-- Insertion des paramètres par défaut
INSERT INTO app_settings (setting_key, setting_value)
VALUES
    ('email_notifications', 'false'),
    ('email_recipient', ''),
    ('whatsapp_notifications', 'false'),
    ('whatsapp_number', '')
ON CONFLICT (setting_key) DO NOTHING;

-- Activer Row Level Security (RLS) - optionnel mais recommandé
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_alerts ENABLE ROW LEVEL SECURITY;

-- Politique d'accès public pour tous (car authentification par PIN dans l'app)
CREATE POLICY "Enable all access for all users" ON users FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON suppliers FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON products FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON app_settings FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON stock_movements FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON sent_alerts FOR ALL USING (true);
