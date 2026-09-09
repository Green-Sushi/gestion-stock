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
-- Lire le nom d'un auteur.
-- La table `users` ayant été fermée le 08/09/2026 (voir
-- migration-securite-comptes.sql), l'application ne peut plus traduire un
-- identifiant d'auteur en nom. Sans cette fonction, la traçabilité
-- existerait sans être lisible dans l'application.
-- Elle ne renvoie QUE identifiants et noms : jamais le rôle, jamais
-- l'empreinte du code. Les noms ne sont pas secrets, ils s'affichent déjà
-- dans le bandeau de l'application.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_user_names()
RETURNS TABLE (user_id UUID, user_name VARCHAR)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT u.id, u.name FROM public.users u ORDER BY u.name;
$$;

REVOKE ALL ON FUNCTION public.list_user_names() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_user_names() TO anon, authenticated;

COMMIT;

-- =====================================================================
-- RETOUR ARRIÈRE
-- =====================================================================
-- À coller dans le SQL Editor de Supabase pour annuler cette migration.
-- Aucune donnée d'origine n'est perdue : seule l'information d'auteur,
-- ajoutée depuis, disparaît.
--
--   ALTER TABLE public.products  DROP COLUMN IF EXISTS created_by;
--   ALTER TABLE public.suppliers DROP COLUMN IF EXISTS created_by;
--   DROP FUNCTION IF EXISTS public.list_user_names();
--
-- =====================================================================
-- CONSULTER LA TRAÇABILITÉ
-- =====================================================================
-- Qui a créé quoi, et quand :
--
--   SELECT p.name AS produit,
--          COALESCE(u.name, '(avant le 08/09/2026)') AS cree_par,
--          p.created_at::date AS le
--     FROM public.products p
--     LEFT JOIN public.users u ON u.id = p.created_by
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
