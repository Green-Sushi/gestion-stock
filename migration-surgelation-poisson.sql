-- =====================================================================
-- SURGÉLATION DU POISSON — 2026-09-08
-- =====================================================================
-- Nouvelle section, DISTINCTE de la congélation des sushis frits.
--
-- Pourquoi une table séparée et non une colonne dans `frozen_sushi` :
-- ce sont deux choses différentes qui se ressemblent. L'une compte des
-- pièces fabriquées et référence un type de sushi ; l'autre pèse de la
-- matière première. Les réunir aurait obligé à transformer les 176
-- entrées existantes et à vivre avec des colonnes vides de part et
-- d'autre. Décision prise avec l'utilisateur sur maquette.
--
-- Cette migration n'AJOUTE que : `frozen_sushi` n'est pas touchée.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.frozen_fish (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Saumon, Thon, Marlin, ou un poisson saisi librement pour les cas
    -- exceptionnels. Pas de table de référence : la liste est courte et
    -- l'utilisateur doit pouvoir sortir du cadre sans intervention.
    fish_type   TEXT NOT NULL,

    -- Entier volontairement : on surgèle 4 kg ou 3 filets, jamais 4,5.
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit        TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'filet')),

    frozen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 6 mois, contre 3 pour les sushis frits : durées de conservation
    -- différentes, c'est l'une des raisons de séparer les deux tables.
    expiry_date DATE NOT NULL,

    -- Numéro de lot, fournisseur : utile le jour d'un contrôle.
    note        TEXT,

    user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    -- Le nom est inscrit ici, PAS joint depuis `users` : cette table est
    -- fermée depuis le 08/09/2026, et toute jointure vers elle échoue.
    user_name   TEXT,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frozen_fish_frozen_at ON public.frozen_fish (frozen_at DESC);
CREATE INDEX IF NOT EXISTS idx_frozen_fish_expiry    ON public.frozen_fish (expiry_date);

COMMENT ON TABLE public.frozen_fish IS
  'Surgélation de poisson brut. Distincte de frozen_sushi (sushis frits) : unités, durée de conservation et usage différents.';

-- Mêmes règles d''accès que les autres tables de l''application. Ce n''est
-- PAS une protection : sans authentification côté base, elles restent
-- ouvertes. Cohérence assumée, à revoir avec le reste au chantier sécurité.
ALTER TABLE public.frozen_fish ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON public.frozen_fish FOR ALL USING (true);

COMMIT;

-- =====================================================================
-- RETOUR ARRIÈRE
-- =====================================================================
-- ⚠️ À N'EXÉCUTER QU'EN MÊME TEMPS QU'UN RETOUR DU CODE. Supprimer la
--    table en laissant l'application en place ferait échouer l'écran
--    Surgélation, qui la lit à chaque ouverture.
--
--   DROP TABLE IF EXISTS public.frozen_fish;
--
-- Aucune autre table n'est modifiée : `frozen_sushi` et ses 176 entrées
-- sont intactes, le retour arrière ne leur fait rien.
-- =====================================================================
-- CONSULTER
-- =====================================================================
-- Ce qui approche de sa limite :
--
--   SELECT fish_type, quantity, unit, frozen_at::date AS surgele_le,
--          expiry_date AS limite, (expiry_date - CURRENT_DATE) AS jours_restants
--     FROM public.frozen_fish
--    WHERE expiry_date <= CURRENT_DATE + 30
--    ORDER BY expiry_date;
-- =====================================================================
