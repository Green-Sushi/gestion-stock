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
