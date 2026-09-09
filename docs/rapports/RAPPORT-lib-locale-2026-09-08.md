# RAPPORT — lib-locale
Date : 2026-09-08 | Branche : `feat/lib-locale` | Session : héberger la bibliothèque Supabase, dernière dépendance extérieure.

## Verdict reviewer-sceptique
**GO** sans correction bloquante. Authenticité du fichier corroborée indépendamment : son en-tête est signé par le CDN et confirme `supabase-js@2.116.0/dist/umd`. Complet, non tronqué, autonome. Testé ensuite sur iPhone par l'utilisateur (ouverture, connexion, affichage, ajustement).

## Fait
- La bibliothèque était chargée depuis `cdn.jsdelivr.net`. Deux problèmes : **sans elle l'application ne peut pas joindre la base**, donc une panne de ce serveur la rendait totalement inutilisable ; et l'adresse demandait « la dernière version 2.x », si bien qu'une mise à jour publiée ailleurs arrivait **sans avoir été décidée ni testée**.
- Version figée **2.116.0** (`dist/umd`), exactement celle qui était servie. Placée dans `vendor/`.
- **L'application ne charge désormais plus AUCUNE ressource extérieure.**
- Pas de `?v=` sur cette balise : le numéro de version est dans le nom du fichier, une montée changera le nom.
- `vendor/LISEZ-MOI.md` : origine, empreinte SHA-256, commande pour la vérifier, et marche à suivre en six étapes pour toute montée — dont l'obligation de tester une vraie connexion avant de publier.

## Vérifications avant bascule
Variante UMD confirmée par l'en-tête du fichier · définit bien le nom global `supabase` avec `createClient` · test complet dans un navigateur simulé contre la VRAIE base : connexion établie, 98 produits lus, compte patron connecté, code non conservé dans la session, employé refusé sur la gestion des comptes.

## Fichiers touchés
- `index.html` — ligne du script, et les trois `?v=` passés à `20260915`.
- `vendor/supabase-js-2.116.0.js` — nouveau (213 Ko disque, ~55 Ko réseau compressé).
- `vendor/LISEZ-MOI.md` — nouveau.

## Points ouverts / doutes
- **PIÈGE POUR LE CHANTIER HORS-LIGNE** : `green-sushi-sw.js` liste `./icon-192.png` et `./icon-512.png` **qui n'existent pas**. Le jour où on l'enregistrera, la mise en cache échouera EN BLOC, en silence. Sa liste ignore aussi `vendor/` et `fonts/`. À corriger AVANT toute activation.
- Le poids ajouté (~55 Ko réseau) est négligeable face aux **6,8 Mo d'images de catégories**, qui restent le vrai sujet de lenteur.
- Toute montée de version exige de revalider une connexion réelle : ce fichier est le seul lien entre l'application et sa base.

## Commande de push suggérée
`git push origin feat/lib-locale`
