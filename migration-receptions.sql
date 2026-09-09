-- =====================================================================
-- TRAÇABILITÉ — REGISTRE DES RÉCEPTIONS — 2026-09-09
-- =====================================================================
-- Une « réception » = une livraison de marchandise, avec ses photos
-- d'étiquettes (codes-barres, DLC, DLUO). C'est ce qu'un contrôle
-- sanitaire demande : prouver ce qui est entré, quand, et d'où.
--
-- Les photos ne sont PAS stockées en base : elles vont dans l'espace de
-- fichiers Supabase. La base ne garde que leur chemin.
--
-- Cette migration n'AJOUTE que. Aucune table existante n'est touchée.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.receptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Facultatif : une réception peut venir d'un fournisseur non encore
    -- enregistré. ON DELETE SET NULL pour qu'effacer un fournisseur ne
    -- détruise jamais une trace de réception.
    supplier_id  UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    -- Nom conservé au moment de la réception : un fournisseur renommé ou
    -- supprimé ne doit pas réécrire l'histoire.
    supplier_name TEXT,

    note         TEXT,

    user_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
    -- Inscrit ici, JAMAIS joint : la table `users` est fermée depuis le
    -- 08/09/2026 et toute jointure vers elle fait échouer la requête.
    user_name    TEXT,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receptions_received_at ON public.receptions (received_at DESC);

-- Une réception porte une ou plusieurs photos. Table séparée plutôt qu'une
-- liste dans une colonne : on peut ainsi en supprimer une sans réécrire
-- les autres, et compter l'espace occupé.
CREATE TABLE IF NOT EXISTS public.reception_photos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reception_id  UUID NOT NULL REFERENCES public.receptions(id) ON DELETE CASCADE,

    -- Chemin dans l'espace de fichiers, PAS une adresse publique : les
    -- adresses sont fabriquées à la demande et expirent.
    storage_path  TEXT NOT NULL,
    taille_octets INTEGER,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reception_photos_reception ON public.reception_photos (reception_id);

COMMENT ON TABLE public.receptions IS
  'Registre des receptions de marchandise, avec photos d''etiquettes. Sert de preuve lors d''un controle sanitaire.';

-- Mêmes règles que le reste de l'application. Ce n'est PAS une protection :
-- sans authentification côté base, ces tables restent ouvertes. Cohérence
-- assumée, à revoir globalement au chantier sécurité.
ALTER TABLE public.receptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON public.receptions       FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON public.reception_photos FOR ALL USING (true);

-- ---------------------------------------------------------------------
-- L'espace de fichiers
-- ---------------------------------------------------------------------
-- NON public : aucune adresse permanente et devinable. L'application
-- fabrique des adresses temporaires à chaque consultation. Une adresse
-- qui fuirait cesserait donc de fonctionner rapidement.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receptions', 'receptions', false, 5242880,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 5 Mo par fichier et types d'images uniquement : la base refuse le reste,
-- indépendamment de ce que l'application enverrait.
CREATE POLICY "receptions_lecture"     ON storage.objects FOR SELECT USING (bucket_id = 'receptions');
CREATE POLICY "receptions_depot"       ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receptions');
CREATE POLICY "receptions_suppression" ON storage.objects FOR DELETE USING (bucket_id = 'receptions');

COMMIT;

-- =====================================================================
-- RETOUR ARRIÈRE
-- =====================================================================
-- ⚠️ À N'EXÉCUTER QU'EN MÊME TEMPS QU'UN RETOUR DU CODE.
-- ⚠️ SUPPRIME LES PHOTOS DÉFINITIVEMENT. Les exporter d'abord si elles
--    ont la moindre valeur de preuve.
--
--   DELETE FROM storage.objects WHERE bucket_id = 'receptions';
--   DELETE FROM storage.buckets WHERE id = 'receptions';
--   DROP TABLE IF EXISTS public.reception_photos;
--   DROP TABLE IF EXISTS public.receptions;
--
-- =====================================================================
-- SURVEILLER L'ESPACE OCCUPÉ
-- =====================================================================
--   SELECT count(*) AS photos,
--          pg_size_pretty(sum(taille_octets)::bigint) AS espace,
--          min(created_at)::date AS plus_ancienne
--     FROM public.reception_photos;
--
-- L'offre gratuite Supabase donne 1 Go. Les photos étant compressées à
-- environ 300 Ko, cela représente de l'ordre de 3 000 photos.
-- =====================================================================

-- =====================================================================
-- COMPLÉMENT — 2026-09-09 : le produit devient le titre de la fiche
-- =====================================================================
-- À l'usage, une fiche de traçabilité ne décrit pas « une livraison »
-- mais « l'étiquette de CE produit ». Le produit devient donc l'entrée
-- principale, choisi en entonnoir : famille d'abord, produit ensuite —
-- indispensable avec 98 produits au catalogue.
--
-- Le fournisseur reste, en information secondaire et facultative.
--
-- N'AJOUTE que deux colonnes. Les réceptions déjà saisies gardent un
-- produit vide, ce qui est normal : elles sont antérieures.
-- =====================================================================

BEGIN;

ALTER TABLE public.receptions
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- Nom conservé au moment de la saisie : un produit renommé ou supprimé ne
-- doit pas réécrire une trace qui sert de preuve. Même raisonnement que
-- pour le fournisseur et pour l'auteur.
ALTER TABLE public.receptions
  ADD COLUMN IF NOT EXISTS product_name TEXT;

COMMENT ON COLUMN public.receptions.product_name IS
  'Nom du produit AU MOMENT de la saisie. La fiche sert de preuve : un renommage ulterieur ne doit pas la reecrire.';

COMMIT;

-- Retour arrière :
--   ALTER TABLE public.receptions DROP COLUMN IF EXISTS product_id;
--   ALTER TABLE public.receptions DROP COLUMN IF EXISTS product_name;
-- ⚠️ À n'exécuter qu'en même temps qu'un retour du code.

-- =====================================================================
-- CATÉGORIE HYGIÈNE — 2026-09-09
-- =====================================================================
-- Le nettoyage était rangé dans « Consommables », avec les barquettes et
-- les baguettes. Deux usages sans rapport : ce qu'on sert au client, et ce
-- qui sert à nettoyer.
--
-- Au passage, la contrainte listait 'autre' (jamais utilisé, 0 produit) et
-- OMETTAIT 'legumes', pourtant proposé dans l'application depuis toujours.
-- Toute création dans Légumes échouait en base : la catégorie ne pouvait
-- pas se remplir, ce qui explique qu'elle soit restée vide.
-- =====================================================================

BEGIN;

ALTER TABLE public.products DROP CONSTRAINT products_category_check;

ALTER TABLE public.products ADD CONSTRAINT products_category_check
  CHECK (category IN ('frais','sec','surgele','consommables','boissons','legumes','hygiene'));

UPDATE public.products SET category = 'hygiene'
WHERE category = 'consommables'
  AND name IN ('Boîte de gants L','Boîte de gants M','Produit lave-vaisselle',
               'Produit pour le sol','Tête de serpillère','Sac Poubelle');

COMMIT;

-- Retour arrière :
--   UPDATE public.products SET category = 'consommables' WHERE category = 'hygiene';
--   ALTER TABLE public.products DROP CONSTRAINT products_category_check;
--   ALTER TABLE public.products ADD CONSTRAINT products_category_check
--     CHECK (category IN ('frais','sec','surgele','consommables','boissons','autre'));
--   ⚠️ Le retour arrière recasse Légumes. À ne faire qu'avec un retour du code.

-- =====================================================================
-- RELEVÉ DE TEMPÉRATURES — 2026-09-09
-- =====================================================================
-- Registre quotidien des enceintes froides, matin et soir. Il fait foi au
-- même titre que les autres : dates à l'heure du restaurant, valeurs figées.
--
-- Un frigo à congélateur intégré compte pour DEUX enceintes : ce sont deux
-- températures distinctes à relever.
--
-- La colonne `origine` sépare deux choses qui ne doivent JAMAIS se
-- confondre :
--   'saisie' = relevé pris dans cette application ;
--   'hygie'  = valeur reconstituée, l'original étant dans le système Hygie
--              qui refuse l'export. Elle porte la mention « voir Hygie »
--              partout où elle apparaît, écran et export compris. Les
--              relevés d'origine restent ce qui fait foi.
--
-- L'unicité (équipement, jour, moment) fait qu'une correction REMPLACE la
-- valeur au lieu d'empiler deux lignes contradictoires.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.equipements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('positif','negatif')),
    seuil_min NUMERIC(4,1) NOT NULL,
    seuil_max NUMERIC(4,1) NOT NULL,
    ordre INTEGER NOT NULL DEFAULT 0,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (seuil_min < seuil_max)
);

CREATE TABLE IF NOT EXISTS public.releves_temperature (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipement_id UUID REFERENCES public.equipements(id) ON DELETE SET NULL,
    equipement_nom TEXT NOT NULL,
    jour DATE NOT NULL,
    moment TEXT NOT NULL CHECK (moment IN ('matin','soir')),
    temperature NUMERIC(4,1) NOT NULL,
    hors_seuil BOOLEAN NOT NULL DEFAULT false,
    origine TEXT NOT NULL DEFAULT 'saisie' CHECK (origine IN ('saisie','hygie')),
    user_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (equipement_id, jour, moment)
);

CREATE INDEX IF NOT EXISTS idx_releves_jour ON public.releves_temperature (jour DESC, moment);
CREATE INDEX IF NOT EXISTS idx_releves_equipement ON public.releves_temperature (equipement_id, jour DESC);

ALTER TABLE public.equipements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releves_temperature ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS equipements_all ON public.equipements;
CREATE POLICY equipements_all ON public.equipements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS releves_all ON public.releves_temperature;
CREATE POLICY releves_all ON public.releves_temperature FOR ALL USING (true) WITH CHECK (true);

-- Consultation : les journées incomplètes du mois écoulé.
--   SELECT jour, moment, COUNT(*) FROM public.releves_temperature
--   WHERE jour > CURRENT_DATE - 30 GROUP BY jour, moment HAVING COUNT(*) < 13
--   ORDER BY jour DESC;

-- Retour arrière :
--   DROP TABLE public.releves_temperature;
--   DROP TABLE public.equipements;
