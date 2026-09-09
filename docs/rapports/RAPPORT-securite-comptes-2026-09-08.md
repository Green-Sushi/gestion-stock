# RAPPORT — securite-comptes
Date : 2026-09-08 | Branche : `feat/securite-comptes` | Session : fermer la table des comptes et rendre les codes PIN illisibles.

## Verdict reviewer-sceptique
**GO après FIX MINEUR** (5 retouches appliquées). Aucun scénario d'enfermement trouvé tant que le patron connaît son code. Lots 1 à 3 (en production) intacts. Testé ensuite sur iPhone par l'utilisateur : connexion des 3 comptes, code redemandé sur l'écran Utilisateurs, attribution d'un nouveau code, et modification sans toucher au code — tous concluants.

## Fait
**Base** (migration appliquée en production, autorisée explicitement) :
- Codes PIN passés en empreinte bcrypt via `pgcrypto` (déjà installé) ; colonne en clair **supprimée**. Les codes existants continuent de fonctionner.
- Table `users` fermée : politique supprimée, RLS active sans aucune politique, et droits **nominatifs** de `anon`/`authenticated` révoqués — un REVOKE sur `PUBLIC` seul n'aurait rien verrouillé sur Supabase.
- 5 fonctions `SECURITY DEFINER` : `verify_pin` (ouverte, ne renvoie jamais le code), `is_admin_pin` (interne, EXECUTE révoqué), et 3 fonctions d'administration exigeant un code patron **vérifié par la base**.
- Gardes : dernier patron non supprimable ni rétrogradable, 6 chiffres imposés, rôles limités.
- Contrôle bloquant avant la suppression de la colonne : chaque empreinte vérifiée contre son code d'origine.

**Application** :
- Connexion par `verify_pin` ; le navigateur ne stocke plus que `{id, name, role, expiresAt}`. **Le code ne sort jamais de la base.**
- Session de 12 h, vérifiée au démarrage **et** en cours d'usage (retour au premier plan + toutes les minutes).
- Une base injoignable ne dit plus « code invalide ».
- Écran Utilisateurs : code patron redemandé, aucun code affiché, champ vide = conserver le code.
- Procédure de secours « code oublié » documentée en fin de migration **et testée**.

## Fichiers touchés
- `database.js` — authentification par RPC, expiration de session, CRUD comptes par fonctions gardées.
- `app.js` — surveillance de l'échéance, retour à la connexion, écran Utilisateurs, code patron en mémoire.
- `index.html` — version des scripts seulement.
- `migration-securite-comptes.sql` — nouveau, documente la migration et le secours.

## Points ouverts / doutes
- **Ce n'est pas un coffre-fort.** `verify_pin` reste appelable de l'extérieur sans limite de tentatives ; un code à 6 chiffres finit par se deviner. Le chiffrement rend chaque essai lent, donc l'attaque longue, pas impossible.
- **Seuls les comptes sont protégés.** Produits, fournisseurs, mouvements, historiques restent lisibles et modifiables par quiconque a la clé publique. Périmètre assumé.
- **Plus aucun code n'est récupérable**, y compris par le patron. Seule la procédure de secours (console Supabase) permet d'en réattribuer un.
- L'expiration ne vérifiait initialement qu'au démarrage : l'application se dégradait en silence après une nuit en arrière-plan. Corrigé, mais c'est le type de défaut à surveiller.
- Reste une dépendance extérieure : la bibliothèque Supabase chargée depuis `cdn.jsdelivr.net`, non épinglée (`@2`).

## Commande de push suggérée
`git push origin feat/securite-comptes`
