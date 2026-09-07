# RAPPORT — trois-niveaux-stock
Date : 2026-09-07 | Branche : `feat/trois-niveaux-stock` | Session : GS Stock passe de 4 niveaux de stock à 3, avec vue d'ensemble sur l'accueil.

## Verdict reviewer-sceptique
**GO** après deux cycles de correction. Règle de calcul éprouvée sur 20 cas limites (seuil à 0, seuil vide, quantité nulle, décimales) : aucun plantage, aucune valeur aberrante. Périmètre respecté, aucun chemin de rafraîchissement non couvert.

## Fait
- `calculateStockLevel()` passe de 4 niveaux à 3 : 🔴 `qté ≤ seuil`, 🟠 `qté ≤ seuil × 2`, 🟢 au-delà. Branche jaune et paramètre `optimalStock` supprimés. Noms de classes CSS conservés.
- Le niveau jaune était structurellement inatteignable : il exigeait `stock optimal > seuil × 4`, vrai pour 3 produits sur 56. 0 produit sur 99 l'atteignait.
- Cartes de catégorie : la pastille blanche « total produits » est remplacée par deux pastilles, rouge et orange, affichées seulement si > 0.
- Nouveau bandeau en haut de l'accueil : totaux rupture / limite / large sur les 99 produits.
- Tri des listes produits : 3 groupes (rupture, limite, large), alphabétique dans chaque groupe. Il n'en connaissait que 2.
- Correctif 1 (revue) : le bandeau et les pastilles restaient périmés après un +/− et après les deux flèches de retour. Trois rafraîchissements ajoutés.
- Correctif 2 (revue) : le premier correctif appelait `renderCategories()` à chaque appui, reconstruisant 7 images de 6,8 Mo sur une page masquée. Remplacé par `updateStockOverview()`.
- Aucune modification de base de données, aucune migration, aucune dépendance ajoutée.

## Fichiers touchés
- `app.js` — calcul des niveaux, pastilles, totalisateur, tri, 3 points de rafraîchissement.
- `index.html` — bandeau accueil + CSS, styles du jaune retirés, version des 3 scripts passée à `?v=20260907`.

## Points ouverts / doutes
- L'écran Alertes reste **rouge uniquement** : les 19 produits en limite se voient sur le bandeau et en tête des listes, pas sur cet écran. Assumé, hors périmètre.
- Le champ « Stock optimal » reste dans le formulaire **sans usage** jusqu'au lot suivant, où il alimentera le « à commander » du message fournisseur.
- Deux références résiduelles au niveau jaune subsistent dans `app.js` (dictionnaires de `renderAlerts` et `generateAlertMessage`) : inatteignables, vérifiées sans risque d'affichage vide. Zone hors périmètre.
- Les 37 rouges actuels reflètent un stock non saisi depuis le 27/05/2026, pas un défaut de réglage. Le recalibrage des seuils attend un inventaire complet.
- Hors lot, découvert en chemin : le service worker `green-sushi-sw.js` n'est **jamais enregistré** — le mode hors ligne n'existe pas du tout. Les images de catégories pèsent 6,8 Mo.

## Commande de push suggérée
`git push origin feat/trois-niveaux-stock`
