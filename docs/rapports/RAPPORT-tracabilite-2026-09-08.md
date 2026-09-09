# RAPPORT — tracabilite
Date : 2026-09-08 | Branche : `feat/tracabilite` (construite sur `feat/fiabilite`) | Session : enregistrer l'auteur des créations, puis ouvrir ce droit aux employés.

## Verdict reviewer-sceptique
**GO après FIX MINEUR** (4 retouches). Le parcours de création par un employé a été tracé maillon par maillon : il fonctionne, et l'employé ne peut toujours ni modifier ni supprimer. Lots 1 à 5 intacts. Testé sur iPhone par l'utilisateur.

## Fait
- **L'ordre était le bon** : l'utilisateur voulait ouvrir la création aux employés « puisque c'est tracé ». Vérification faite, c'était FAUX — `products` n'avait aucune colonne d'auteur. La traçabilité d'abord, le droit ensuite.
- Base : colonnes `created_by` et `created_by_name` sur `products` et `suppliers`. Les 98 produits existants gardent un auteur vide, affiché comme « fiche antérieure ».
- La fiche produit affiche « Ajouté par X le … ».
- **Le bouton « + » est ouvert aux employés.** Modifier et supprimer restent au patron.
- Retour arrière documenté, **avec l'avertissement qu'il faut revenir le code en même temps**, sans quoi toute création échoue.

## Fichiers touchés
- `database.js` — auteur inscrit à la création d'un produit et d'un fournisseur.
- `app.js` — affichage de l'origine, droit de création ouvert.
- `index.html` — mention d'origine sous le titre de la fiche.
- `migration-tracabilite-creation.sql` — nouveau.

## Points ouverts / doutes
- **Défaut que j'avais introduit et que la revue a rattrapé** : la première version lisait les noms via une fonction publique, ce qui **rendait les prénoms du personnel lisibles par quiconque possède la clé** — juste après les avoir fermés le matin même. Le nom est désormais inscrit sur la fiche ; la fonction est supprimée de la base.
- **La traçabilité est déclarative.** `products` reste ouverte en écriture : l'auteur est inscrit de bonne foi par l'application, ce n'est pas une preuve opposable.
- Renommer un compte ne réécrit pas l'historique — comportement voulu pour un journal.
- Rien dans l'application ne permet de **consulter** la traçabilité : les requêtes sont documentées en fin de migration.

## Commande de push suggérée
`git push origin feat/tracabilite`
