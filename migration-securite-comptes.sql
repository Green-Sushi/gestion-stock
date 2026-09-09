-- =====================================================================
-- SÉCURITÉ DES COMPTES — 2026-09-08
-- =====================================================================
-- Ferme la table `users` et rend les codes PIN illisibles.
--
-- AVANT : les 3 codes PIN étaient stockés EN CLAIR dans `users`, et la
-- table était lisible par quiconque possédait la clé publique (écrite
-- dans config.js, donc visible en ouvrant la page). N'importe qui
-- pouvait donc lire le code du patron.
--
-- APRÈS : les codes sont des empreintes bcrypt, la table n'est plus
-- accessible du tout depuis le navigateur, et quatre fonctions gardées
-- la remplacent. Les fonctions qui écrivent exigent un code patron
-- valide — sans authentification Supabase, c'est la seule garde honnête.
--
-- Les codes existants continuent de fonctionner : ils sont chiffrés en
-- place, personne n'a besoin d'en changer.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Empreintes des codes existants
-- ---------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin_hash TEXT;

UPDATE public.users
   SET pin_hash = extensions.crypt(pin_code, extensions.gen_salt('bf', 10))
 WHERE pin_hash IS NULL;

-- Garde-fou : si une seule empreinte ne correspond pas à son code
-- d'origine, on annule tout. Sans ça, un utilisateur serait enfermé.
DO $$
DECLARE mauvais INT;
BEGIN
  SELECT count(*) INTO mauvais
    FROM public.users
   WHERE pin_hash IS NULL
      OR pin_hash <> extensions.crypt(pin_code, pin_hash);
  IF mauvais > 0 THEN
    RAISE EXCEPTION 'ARRÊT : % empreinte(s) ne correspondent pas au code d''origine', mauvais;
  END IF;
END $$;

ALTER TABLE public.users ALTER COLUMN pin_hash SET NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Le code appartient-il à un patron ? (usage interne aux gardes)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
     WHERE role = 'patron'
       AND pin_hash = extensions.crypt(p_pin, pin_hash)
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Connexion : seule fonction ouverte sans garde. Ne renvoie JAMAIS
--    l'empreinte, seulement de quoi identifier la session.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_pin(p_pin TEXT)
RETURNS TABLE (user_id UUID, user_name VARCHAR, user_role VARCHAR)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT u.id, u.name, u.role
    FROM public.users u
   WHERE u.pin_hash = extensions.crypt(p_pin, u.pin_hash)
   LIMIT 1;
$$;

-- ---------------------------------------------------------------------
-- 4. Écran « Gérer les utilisateurs » — les trois fonctions gardées.
--    Chacune porte SA PROPRE garde : une fonction SECURITY DEFINER
--    contourne les politiques, elle doit donc se protéger elle-même.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_users(p_admin_pin TEXT)
RETURNS TABLE (user_id UUID, user_name VARCHAR, user_role VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin_pin(p_admin_pin) THEN
    RAISE EXCEPTION 'Code patron invalide';
  END IF;
  RETURN QUERY SELECT u.id, u.name, u.role FROM public.users u ORDER BY u.name;
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_user(
  p_admin_pin TEXT, p_id UUID, p_name TEXT, p_role TEXT, p_pin TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.is_admin_pin(p_admin_pin) THEN
    RAISE EXCEPTION 'Code patron invalide';
  END IF;
  IF p_role NOT IN ('patron', 'employe') THEN
    RAISE EXCEPTION 'Rôle inconnu : %', p_role;
  END IF;
  IF p_pin IS NOT NULL AND p_pin !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'Le code doit comporter 6 chiffres';
  END IF;

  IF p_id IS NULL THEN
    IF p_pin IS NULL THEN
      RAISE EXCEPTION 'Un nouveau compte exige un code';
    END IF;
    INSERT INTO public.users (name, role, pin_hash)
    VALUES (p_name, p_role, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
    RETURNING id INTO v_id;
  ELSE
    -- Ne jamais laisser le dernier patron se rétrograder : personne ne
    -- pourrait plus gérer les comptes.
    IF p_role <> 'patron'
       AND (SELECT role FROM public.users WHERE id = p_id) = 'patron'
       AND (SELECT count(*) FROM public.users WHERE role = 'patron') <= 1 THEN
      RAISE EXCEPTION 'Impossible : ce serait le dernier patron';
    END IF;
    UPDATE public.users
       SET name = p_name,
           role = p_role,
           pin_hash = CASE WHEN p_pin IS NULL THEN pin_hash
                           ELSE extensions.crypt(p_pin, extensions.gen_salt('bf', 10)) END,
           updated_at = now()
     WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_admin_pin TEXT, p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin_pin(p_admin_pin) THEN
    RAISE EXCEPTION 'Code patron invalide';
  END IF;
  IF (SELECT role FROM public.users WHERE id = p_id) = 'patron'
     AND (SELECT count(*) FROM public.users WHERE role = 'patron') <= 1 THEN
    RAISE EXCEPTION 'Impossible : ce serait le dernier patron';
  END IF;
  DELETE FROM public.users WHERE id = p_id;
END $$;

-- ---------------------------------------------------------------------
-- 5. Fermeture de la table.
--    ATTENTION : sur Supabase, anon et authenticated reçoivent des
--    privilèges NOMINATIFS à la création des tables. Un REVOKE sur
--    PUBLIC seul ne verrouille rien : il faut les nommer.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable all access for all users" ON public.users;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;  -- aucune politique = tout refusé
REVOKE ALL ON TABLE public.users FROM anon, authenticated, PUBLIC;

-- Les fonctions, elles, restent appelables par l'application.
REVOKE ALL ON FUNCTION public.is_admin_pin(TEXT) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_user(TEXT, UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(TEXT, UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Le code en clair disparaît. IRRÉVERSIBLE.
-- ---------------------------------------------------------------------
ALTER TABLE public.users DROP COLUMN pin_code;

COMMIT;

-- =====================================================================
-- PROCÉDURE DE SECOURS — « j'ai oublié mon code »
-- =====================================================================
-- Les codes sont désormais illisibles, y compris par le patron. Il n'existe
-- AUCUN moyen de retrouver un code oublié : on ne peut qu'en attribuer un
-- nouveau. Cette manœuvre se fait depuis le tableau de bord Supabase,
-- rubrique « SQL Editor », et exige donc l'accès au compte Supabase.
--
-- 1. Voir les comptes existants (aucun code n'est affiché, c'est normal) :
--
--      SELECT id, name, role FROM public.users ORDER BY name;
--
-- 2. Attribuer un nouveau code à un compte. Remplacer le nom et le code :
--
--      UPDATE public.users
--         SET pin_hash = extensions.crypt('123456', extensions.gen_salt('bf', 10)),
--             updated_at = now()
--       WHERE name = 'Patron';
--
--    Le code doit comporter 6 chiffres. Il devient actif immédiatement.
--
-- 3. Vérifier que le nouveau code fonctionne :
--
--      SELECT * FROM public.verify_pin('123456');
--
--    Une ligne = le code marche. Aucune ligne = il ne marche pas.
--
-- ⚠️ Ne jamais laisser un code d'exemple en place. Le changer immédiatement
--    depuis l'application, écran Paramètres > Utilisateurs.
-- =====================================================================
