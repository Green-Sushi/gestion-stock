# vendor/ — bibliothèques hébergées ici

## Pourquoi

L'application chargeait la bibliothèque Supabase depuis `cdn.jsdelivr.net`.
Deux problèmes :

1. **Sans elle, l'application ne peut pas joindre la base.** Une panne de ce
   serveur extérieur rendait l'outil totalement inutilisable, alors que tout
   le reste (écrans, polices, images) était déjà hébergé ici.
2. **L'adresse demandait « la dernière version 2.x ».** Une mise à jour
   publiée ailleurs arrivait donc chez les utilisateurs sans avoir été ni
   décidée ni testée.

Même raisonnement que pour les polices Fredoka et Outfit, hébergées ici pour
les mêmes raisons.

## Ce qu'il y a

| Fichier | Version | Origine |
|---|---|---|
| `supabase-js-2.116.0.js` | 2.116.0 (`dist/umd`) | `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0` |

Empreinte SHA-256 (32 premiers caractères) : `fbde52aab1700a3b308087ae78b41fb5`

## Monter de version — la marche à suivre

Ce n'est **pas** une opération anodine : si le fichier est mauvais,
l'application ne parle plus du tout à la base.

1. Télécharger la version voulue en la **nommant explicitement** :
   `curl -o vendor/supabase-js-<version>.js https://cdn.jsdelivr.net/npm/@supabase/supabase-js@<version>`
2. Vérifier que c'est bien la variante `dist/umd` (l'en-tête du fichier le dit)
   et qu'elle définit le nom global `supabase` avec `createClient`.
3. Changer la ligne `<script src="./vendor/...">` dans `index.html`.
4. Incrémenter le `?v=` des trois scripts, sinon les téléphones garderont
   l'ancien code.
5. **Tester une vraie connexion** avant de publier. Pas seulement l'ouverture
   de la page : se connecter, lire les produits, ajuster une quantité.
6. Garder l'ancien fichier jusqu'à validation.

Ne jamais revenir à une adresse extérieure « juste pour dépanner ».
