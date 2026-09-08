# RAPPORT — coherence-commandes
Date : 2026-09-08 | Branche : `feat/coherence-commandes` | Session : harmoniser les boutons et fenêtres sur la charte GSV3, ouvrir les Paramètres aux employés.

## Verdict reviewer-sceptique
**GO après FIX MINEUR** (5 retouches appliquées). Les trois risques graves ont été tracés chemin par chemin et écartés : employé non enfermé, codes PIN hors de portée, sens des boutons d'envoi non inversé. Lots 1 et 2 (en production) intacts. Validé ensuite sur iPhone par l'utilisateur.

## Fait
- Les **10 boutons habillés à la main** dans leur balise passent sur des classes partagées (`btn-full`, `btn-stacked`, `btn-ghost`, `btn-success`, `btn-whatsapp`, `btn-email`). Plus aucune couleur écrite dans une balise **de bouton**.
- Les **10 valeurs d'arrondi ramenées aux 4 de la charte** : 8 / 13 / 18 / pilule. Les grands boutons passent en pilule.
- Fenêtres de confirmation refondues : les boutons **nomment l'action** (« Se déconnecter » / « Annuler », « Oui, c'est envoyé » / « Non, pas encore »), sont **empilés** avec l'action en haut, l'annulation en contour seul, 48 px de haut minimum.
- Bandeau : le bouton « Se déconnecter » est remplacé par une **pastille de session** (« 🔑 Patron », « 👤 Anjeli »), qui répond aussi à « on ne sait pas qui est connecté ». L'icône de rôle faisait doublon, supprimée.
- **Onglet Paramètres ouvert aux employés** — condition pour qu'ils gardent un chemin de déconnexion. 4 des 6 blocs leur restent masqués, dont « Utilisateurs » qui affiche tous les codes PIN en clair.
- Retouches de revue : brief de relais sorti du dépôt, interrupteur repassé en pilule, cale-espace du bandeau mis sur classe, pastille bornée contre les noms longs, style `.header-icon` mort supprimé.
- Aucune modification de base, aucune dépendance, **aucun changement de comportement**.

## Fichiers touchés
- `index.html` — classes de boutons, arrondis, deux fenêtres de confirmation, bandeau, identifiants des blocs Paramètres.
- `app.js` — pastille de session, retrait de l'écouteur du bandeau, ouverture de l'onglet Paramètres et masquage des 4 blocs.
- `.gitignore` — créé, pour tenir le brief de relais hors dépôt.

## Points ouverts / doutes
- **Le masquage des blocs n'est PAS une protection.** C'est un masquage à l'affichage, le même mécanisme qu'avant. Les droits de cette application resteront décoratifs tant que la base sera ouverte (RLS `USING(true)` partout, clé publique visible dans le code). À traiter au chantier sécurité.
- Il reste **6 couleurs écrites en dur** dans des balises hors boutons, dont 3 dans les fenêtres refondues. Non traité, hors périmètre annoncé.
- Ce lot a été **écrit par l'orchestrateur**, le buildeur ayant été coupé par une limite d'usage. La séparation « celui qui écrit / celui qui relit » n'a pas joué à l'écriture ; la revue a été menée en connaissance de cause et a trouvé 5 défauts.
- La création de produits par les employés reste **reportée** : la table `products` n'a aucune colonne d'auteur, donc « on saura qui fait quoi » serait faux.

## Commande de push suggérée
`git push origin feat/coherence-commandes`
