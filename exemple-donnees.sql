-- ============================================
-- EXEMPLE D'IMPORT DE DONNÉES POUR GREEN SUSHI
-- ============================================
-- Ce fichier contient des exemples de fournisseurs et produits
-- À adapter selon vos besoins réels
--
-- UTILISATION :
-- 1. Modifiez les données ci-dessous avec vos propres fournisseurs/produits
-- 2. Copiez tout le contenu de ce fichier
-- 3. Collez dans le SQL Editor de Supabase
-- 4. Cliquez sur "Run"
-- ============================================

-- ============================================
-- FOURNISSEURS
-- ============================================

INSERT INTO suppliers (name, contact_name, phone, email, address, notes) VALUES
  ('Métro', 'Service Commercial', '0596123456', 'contact@metro.fr', '123 Rue du Commerce, Fort-de-France', 'Fournisseur principal'),
  ('Promocash', 'Jean Dupont', '0596234567', 'info@promocash.fr', '456 Avenue des Entreprises', 'Livraison le mardi et jeudi'),
  ('Distributeur Asiatique', 'Wang Li', '0596345678', 'wang@asia-distrib.fr', '789 Zone Industrielle', 'Spécialiste produits asiatiques'),
  ('Grossiste Bio', 'Marie Martin', '0596456789', 'contact@bio-gros.fr', '321 Chemin du Bio', 'Produits biologiques certifiés'),
  ('Poissonnerie Maritime', 'Pierre Ocean', '0596567890', 'pierre@maritime.fr', '654 Port de Pêche', 'Poissons et fruits de mer frais'),
  ('Fromager Local', 'Sophie Fromage', '0596678901', 'sophie@fromages.fr', '987 Rue des Artisans', 'Fromages de qualité'),
  ('Fournitures Pro', 'Luc Service', '0596789012', 'contact@fournitures-pro.fr', '147 Avenue Industrielle', 'Consommables et matériel'),
  ('Distriboissons', 'Alice Boisson', '0596890123', 'alice@distriboissons.fr', '258 Route des Boissons', 'Boissons locales et importées'),
  ('Caviste', 'Marc Vins', '0596901234', 'marc@caviste.fr', '369 Rue du Vin', 'Bières et alcools');

-- ============================================
-- PRODUITS - STOCK FRAIS
-- ============================================

INSERT INTO products (name, category, quantity, unit, alert_threshold, supplier_id, notes)
VALUES
  ('Oeufs', 'frais', 5, 'boîtes de 6', 2,
   (SELECT id FROM suppliers WHERE name = 'Métro'),
   'Oeufs frais calibre moyen'),

  ('Moutarde', 'frais', 3, 'pots', 1,
   (SELECT id FROM suppliers WHERE name = 'Promocash'),
   'Moutarde de Dijon'),

  ('Tomate séchée', 'frais', 2, 'pots', 1,
   (SELECT id FROM suppliers WHERE name = 'Métro'),
   'Tomates séchées à l''huile'),

  ('Piment d''Espelette', 'frais', 2, 'pots', 1,
   (SELECT id FROM suppliers WHERE name = 'Grossiste Bio'),
   'AOP Piment d''Espelette'),

  ('Fromage carré crémeux', 'frais', 15, 'boîtes', 10,
   (SELECT id FROM suppliers WHERE name = 'Fromager Local'),
   'Type Philadelphia'),

  ('Cheddar en tranche', 'frais', 8, 'paquets', 5,
   (SELECT id FROM suppliers WHERE name = 'Fromager Local'),
   'Cheddar orange'),

  ('Emmental en bloc', 'frais', 2, 'blocs', 1,
   (SELECT id FROM suppliers WHERE name = 'Fromager Local'),
   'Emmental français'),

  ('Concombre', 'frais', 15, 'pièces', 10,
   (SELECT id FROM suppliers WHERE name = 'Grossiste Bio'),
   'Concombre bio'),

  ('Avocat', 'frais', 20, 'pièces', 10,
   (SELECT id FROM suppliers WHERE name = 'Grossiste Bio'),
   'Avocat Hass mûr à point'),

  ('Oignon peyi', 'frais', 2.5, 'kg', 1,
   (SELECT id FROM suppliers WHERE name = 'Grossiste Bio'),
   'Oignon local martiniquais'),

  ('Oignon rouge', 'frais', 15, 'pièces', 10,
   (SELECT id FROM suppliers WHERE name = 'Grossiste Bio'),
   'Oignon rouge doux'),

  ('Carottes', 'frais', 10, 'pièces', 5,
   (SELECT id FROM suppliers WHERE name = 'Grossiste Bio'),
   'Carottes bio'),

  ('Chou rouge', 'frais', 2, 'pièces', 1,
   (SELECT id FROM suppliers WHERE name = 'Grossiste Bio'),
   'Chou rouge frais'),

  ('Navet', 'frais', 5, 'pièces', 2,
   (SELECT id FROM suppliers WHERE name = 'Grossiste Bio'),
   'Navet blanc');

-- ============================================
-- PRODUITS - STOCK SURGELÉ
-- ============================================

INSERT INTO products (name, category, quantity, unit, alert_threshold, supplier_id, notes)
VALUES
  ('Boîte de crevettes tempura', 'surgele', 15, 'boîtes', 10,
   (SELECT id FROM suppliers WHERE name = 'Poissonnerie Maritime'),
   'Crevettes panées façon tempura'),

  ('Sachet de gyoza', 'surgele', 8, 'sachets', 5,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Raviolis japonais assortis'),

  ('Sachet de wakame', 'surgele', 7, 'sachets', 5,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Algue wakame surgelée'),

  ('Carpaccio de boeuf', 'surgele', 2, 'sachets', 1,
   (SELECT id FROM suppliers WHERE name = 'Promocash'),
   'Fines tranches de boeuf');

-- ============================================
-- PRODUITS - STOCK SEC
-- ============================================

INSERT INTO products (name, category, quantity, unit, alert_threshold, supplier_id, notes)
VALUES
  ('Riz', 'sec', 45, 'kg', 40,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Riz pour sushi, variété japonica'),

  ('Sachet de panure Panko', 'sec', 8, 'sachets', 5,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Chapelure japonaise'),

  ('Feuille d''algue nori', 'sec', 7, 'sachets', 5,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Feuilles nori qualité supérieure'),

  ('Sachet de gingembre mariné', 'sec', 8, 'sachets', 5,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Gari (gingembre rose)'),

  ('Wasabi en poudre', 'sec', 4, 'sachets', 3,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Wasabi japonais authentique'),

  ('Sauce soja Kikoman', 'sec', 2, 'bidons de 20L', 1,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Sauce soja fermentée naturellement'),

  ('Sauce Sweet', 'sec', 2, 'bidons de 5L', 1,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Sauce sucrée pour sushi'),

  ('Sauce Sriracha', 'sec', 2, 'bidons de 5L', 1,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Sauce piquante thaï'),

  ('Vinaigre blanc', 'sec', 2, 'bidons de 10L', 1,
   (SELECT id FROM suppliers WHERE name = 'Métro'),
   'Vinaigre d''alcool'),

  ('Sucre blanc', 'sec', 15, 'kg', 10,
   (SELECT id FROM suppliers WHERE name = 'Métro'),
   'Sucre cristallisé'),

  ('Sucre roux', 'sec', 15, 'kg', 10,
   (SELECT id FROM suppliers WHERE name = 'Métro'),
   'Sucre de canne roux'),

  ('Huile de tournesol', 'sec', 25, 'L', 20,
   (SELECT id FROM suppliers WHERE name = 'Métro'),
   'Huile de friture'),

  ('Farine', 'sec', 8, 'kg', 5,
   (SELECT id FROM suppliers WHERE name = 'Métro'),
   'Farine T45');

-- ============================================
-- PRODUITS - STOCK CONSOMMABLE
-- ============================================

INSERT INTO products (name, category, quantity, unit, alert_threshold, supplier_id, notes)
VALUES
  ('Baguettes chinoises', 'consommable', 15, 'sachets', 10,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Baguettes jetables en bois'),

  ('Film transparent', 'consommable', 2, 'rouleaux', 1,
   (SELECT id FROM suppliers WHERE name = 'Fournitures Pro'),
   'Film alimentaire 300m'),

  ('Papier aluminium', 'consommable', 2, 'rouleaux', 1,
   (SELECT id FROM suppliers WHERE name = 'Fournitures Pro'),
   'Aluminium alimentaire'),

  ('Sachet kraft grand format', 'consommable', 3, 'cartons', 2,
   (SELECT id FROM suppliers WHERE name = 'Fournitures Pro'),
   'Sachets à emporter grands'),

  ('Sachet kraft petit format', 'consommable', 3, 'cartons', 2,
   (SELECT id FROM suppliers WHERE name = 'Fournitures Pro'),
   'Sachets à emporter petits'),

  ('Plateaux ronds à sushi', 'consommable', 2, 'cartons', 1,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Plateaux plastique ronds'),

  ('Produit pour le sol', 'consommable', 2, 'bidons', 1,
   (SELECT id FROM suppliers WHERE name = 'Fournitures Pro'),
   'Détergent sol professionnel'),

  ('Tête de serpillère', 'consommable', 3, 'exemplaires', 2,
   (SELECT id FROM suppliers WHERE name = 'Fournitures Pro'),
   'Têtes de balai à franges'),

  ('Produit lave-vaisselle', 'consommable', 2, 'sachets', 1,
   (SELECT id FROM suppliers WHERE name = 'Fournitures Pro'),
   'Pastilles lave-vaisselle pro'),

  ('Boîte de gants par taille', 'consommable', 5, 'boîtes', 3,
   (SELECT id FROM suppliers WHERE name = 'Fournitures Pro'),
   'Gants latex jetables');

-- ============================================
-- PRODUITS - STOCK BOISSONS
-- ============================================

INSERT INTO products (name, category, quantity, unit, alert_threshold, supplier_id, notes)
VALUES
  ('MR BASIL - Maracudja', 'boisson', 24, 'bouteilles', 12,
   (SELECT id FROM suppliers WHERE name = 'Distriboissons'),
   'Boisson locale maracudja'),

  ('MR BASIL - Mangue', 'boisson', 24, 'bouteilles', 12,
   (SELECT id FROM suppliers WHERE name = 'Distriboissons'),
   'Boisson locale mangue'),

  ('MR BASIL - Grenade', 'boisson', 24, 'bouteilles', 12,
   (SELECT id FROM suppliers WHERE name = 'Distriboissons'),
   'Boisson locale grenade'),

  ('MR BASIL - Kiwi', 'boisson', 24, 'bouteilles', 12,
   (SELECT id FROM suppliers WHERE name = 'Distriboissons'),
   'Boisson locale kiwi'),

  ('KEFWI - Lanmou Red', 'boisson', 24, 'bouteilles', 12,
   (SELECT id FROM suppliers WHERE name = 'Distriboissons'),
   'Kombucha local'),

  ('KEFWI - Ginger Beer', 'boisson', 24, 'bouteilles', 12,
   (SELECT id FROM suppliers WHERE name = 'Distriboissons'),
   'Bière de gingembre'),

  ('BIERES - Asahi', 'boisson', 24, 'bouteilles', 12,
   (SELECT id FROM suppliers WHERE name = 'Caviste'),
   'Bière japonaise 33cl'),

  ('BIERES - Kirin', 'boisson', 24, 'bouteilles', 12,
   (SELECT id FROM suppliers WHERE name = 'Caviste'),
   'Bière japonaise 33cl'),

  ('BIERES - Sapporo', 'boisson', 24, 'bouteilles', 12,
   (SELECT id FROM suppliers WHERE name = 'Caviste'),
   'Bière japonaise 33cl'),

  ('LIMONADES JAPONAISES', 'boisson', 24, 'bouteilles', 12,
   (SELECT id FROM suppliers WHERE name = 'Distributeur Asiatique'),
   'Ramune assortis'),

  ('INFUSION BIO - One Piece', 'boisson', 10, 'boîtes', 5,
   (SELECT id FROM suppliers WHERE name = 'Grossiste Bio'),
   'Thé bio collection manga'),

  ('INFUSION BIO - Naruto', 'boisson', 10, 'boîtes', 5,
   (SELECT id FROM suppliers WHERE name = 'Grossiste Bio'),
   'Thé bio collection manga');

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Compter les produits insérés par catégorie
SELECT
  category,
  COUNT(*) as nombre_produits
FROM products
GROUP BY category
ORDER BY category;

-- Lister tous les fournisseurs
SELECT name, phone, email FROM suppliers ORDER BY name;

-- ============================================
-- FIN DE L'IMPORT
-- ============================================
-- Si tout s'est bien passé, vous devriez voir :
-- - 9 fournisseurs
-- - ~50 produits répartis dans 5 catégories
-- ============================================
