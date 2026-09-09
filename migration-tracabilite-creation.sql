-- =====================================================================
-- TRAÇABILITÉ DES CRÉATIONS — 2026-09-08
-- =====================================================================
-- Les mouvements de stock, les congélations et les envois enregistrent
-- déjà leur auteur. Les CRÉATIONS, non : la table `products` n'avait
-- aucune colonne d'auteur. On ne pouvait donc pas savoir qui avait créé
-- une fiche produit.
--
-- C'était le préalable à l'ouverture de la création aux employés :
-- sans cette colonne, « on saura qui fait quoi » aurait été faux.
--
-- Cette migration AJOUTE seulement. Rien n'est supprimé, rien n'est
-- transformé : elle est entièrement réversible (voir la fin du fichier).
--
-- Les produits existants gardent un auteur vide : ils sont antérieurs.
-- =====================================================================

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS created_by UUID
  REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.products.created_by IS
  'Auteur de la création. Vide pour les produits antérieurs au 08/09/2026. '
  'Renseigné par l''application ; la table restant ouverte en écriture, '
  'cette information est déclarative et non contrainte.';

-- Les fournisseurs souffrent du même manque. Même traitement, pour ne pas
-- avoir à refaire une migration le jour où la question se posera.
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS created_by UUID
  REFERENCES public.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Nom de l'auteur, inscrit AU MOMENT de la création.
-- Pourquoi le nom et pas seulement l'identifiant : la table `users` ayant
-- été fermée le 08/09/2026 (voir migration-securite-comptes.sql),
-- l'application ne peut plus traduire un identifiant en nom. La première
-- version de cette migration ouvrait pour cela une fonction publique
-- listant les comptes — ce qui rendait les prénoms du personnel lisibles
-- par quiconque possède la clé publique. Écrire le nom sur la fiche évite
-- toute exposition.
-- Effet de bord assumé, et correct pour un journal : renommer un compte
-- plus tard ne réécrit pas l'historique.
-- ---------------------------------------------------------------------
ALTER TABLE public.products  ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS created_by_name TEXT;

COMMIT;

-- =====================================================================
-- RETOUR ARRIÈRE
-- =====================================================================
-- À coller dans le SQL Editor de Supabase pour annuler cette migration.
-- Aucune donnée d'origine n'est perdue : seule l'information d'auteur,
-- ajoutée depuis, disparaît.
--
-- ⚠️ À N'EXÉCUTER QU'EN MÊME TEMPS QU'UN RETOUR DU CODE DE L'APPLICATION.
--    L'application écrit dans ces colonnes à chaque création. Les supprimer
--    en laissant le code en place ferait ÉCHOUER toute création de produit
--    et de fournisseur : la base rejette une écriture vers une colonne qui
--    n'existe pas. Revenir d'abord au code d'avant, puis exécuter ceci.
--
--   ALTER TABLE public.products  DROP COLUMN IF EXISTS created_by;
--   ALTER TABLE public.products  DROP COLUMN IF EXISTS created_by_name;
--   ALTER TABLE public.suppliers DROP COLUMN IF EXISTS created_by;
--   ALTER TABLE public.suppliers DROP COLUMN IF EXISTS created_by_name;
--
-- =====================================================================
-- CONSULTER LA TRAÇABILITÉ
-- =====================================================================
-- Qui a créé quoi, et quand :
--
--   SELECT p.name AS produit,
--          COALESCE(p.created_by_name, '(avant le 08/09/2026)') AS cree_par,
--          p.created_at::date AS le
--     FROM public.products p
--    ORDER BY p.created_at DESC;
--
-- Qui a bougé les quantités (déjà tracé de longue date) :
--
--   SELECT u.name, m.movement_type, m.quantity_before, m.quantity_after,
--          m.created_at
--     FROM public.stock_movements m
--     JOIN public.users u ON u.id = m.user_id
--    ORDER BY m.created_at DESC LIMIT 50;
-- =====================================================================
