# RAPPORT — surgelation-poisson (et fusion de six lots)
Date : 2026-09-09 | Branche : `integration-lots` | Session : nouvel écran Surgélation du poisson, puis réunion des six lots en attente.

## Verdict reviewer-sceptique
**GO après FIX MINEUR** sur la surgélation (4 retouches). Le calcul de péremption — seul endroit à conséquence sanitaire — a été exécuté et vérifié, frontières et fuseau horaire compris. Testé ensuite sur iPhone par l'utilisateur.

## Fait
**Surgélation du poisson** — table `frozen_fish` SÉPARÉE de `frozen_sushi`, qui n'est pas touchée (176 entrées intactes). Décision prise sur maquette : deux choses différentes qui se ressemblent — l'une compte des pièces fabriquées, l'autre pèse de la matière première.
- Saumon / Thon / Marlin / Autre en saisie libre. **Pas de crevette.** Unité kg ou filet, entiers. Péremption à **6 mois** (3 pour les sushis).
- Garde-fous en base testés : quantité nulle ou négative, unité inventée, poisson vide — tous refusés. 7 essais sur 7.
- **La date limite est affichée**, avec pastille « expire bientôt » à 30 jours et « expiré » au-delà. Rien ne prévenait jusqu'ici, alors que la donnée existait depuis décembre.
- Vocabulaire : « Congélation » devient « Sushi frit » partout.

**Corrections issues de la revue et des tests**
- `+ 6 mois` débordait : 31 août donnait le 3 mars au lieu du 28 février. Pour une péremption alimentaire, le mauvais sens. Ramené au dernier jour du mois, années bissextiles vérifiées.
- L'écran affirmait « Aucune surgélation enregistrée » même quand la lecture avait ÉCHOUÉ.
- `getFrozenFishForExport` supprimée : sans appel, et rangeant dans le mois précédent toute saisie faite en début de mois après 20 h.
- Suppression **ouverte à tous sur décision de l'utilisateur**, contre l'avis du reviewer et le mien. En contrepartie, la confirmation nomme sa cible.

**Fusion des six lots** — deux conflits, tous deux annoncés par la revue : la carte d'accueil (l'illustration l'emporte) et le numéro de version, qui aurait **reculé** — les téléphones auraient gardé l'ancien code.

## Fichiers touchés
`database.js` · `app.js` · `index.html` · `migration-surgelation-poisson.sql` · 2 images.

## Points ouverts / doutes
- **`frozen_fish` est ouverte comme toutes les autres tables.** Ce n'est pas une protection : à traiter globalement au chantier sécurité.
- **N'importe qui peut effacer une ligne du registre**, y compris un employé. Choix assumé de l'utilisateur, après exposé de l'argument du contrôle sanitaire.
- L'écran des sushis frits n'a toujours **aucun moyen de supprimer** une entrée, alors que la méthode existe en base depuis l'origine.
- Un incident a révélé le vrai risque de la journée : **deux piles de travail en parallèle rendent impossible de savoir ce qu'on teste.** L'utilisateur a signalé comme défauts trois comportements déjà corrigés sur l'autre branche. À ne pas reproduire : publier au fil de l'eau.

## Commande de push suggérée
`git push origin integration-lots`
