# RAPPORT — fiabilite
Date : 2026-09-08 | Branche : `feat/fiabilite` | Session : confirmer les enregistrements et signaler le hors-ligne.

## Verdict reviewer-sceptique
**GO après FIX MINEUR** (5 retouches). Le conteneur de messages ne bloque aucun appui — vérifié y compris sur ses éléments enfants, c'était le risque majeur. Lots 1 à 4 intacts. Testé sur iPhone par l'utilisateur, coupure wifi comprise.

## Fait
- **L'application ne disait JAMAIS « c'est enregistré ».** Messages de confirmation ajoutés sur produit, fournisseur, compte, congélation et réglages.
- **Bandeau permanent hors ligne.** Sans réseau, un appui sur « +1 » changeait le chiffre à l'écran pendant que rien ne partait en base : saisie perdue en silence. Le contenu descend pour laisser place au bandeau, qui passe sous les fenêtres et remonte en haut sur l'écran de connexion.
- Un ajustement qui échoue **revient à l'ancienne valeur** et le signale.
- **`saveSettings` annonçait « ✅ Paramètres sauvegardés ! » sans jamais regarder le résultat** : les quatre enregistrements pouvaient tous échouer. Corrigé.
- Les échecs distinguent le réseau du reste, et le cas fréquent du wifi faible (« Failed to fetch ») parle enfin français.

## Fichiers touchés
- `app.js` — `notifier`, `estHorsLigne`, `majBandeauReseau`, `signalerEchec`, câblage des chemins d'enregistrement.
- `index.html` — zone de messages, bandeau hors-ligne, décalage du contenu.

## Points ouverts / doutes
- **Choix assumé : aucune confirmation sur les appuis +/- et +10.** Jusqu'à 250 par session d'inventaire ; le chiffre qui change est la confirmation. Seul l'échec est signalé.
- Il reste **22 appels à `alert()`** ailleurs (refus d'accès, validations de formulaire). Deux styles coexistent ; jugé acceptable, non traité.
- `navigator.onLine` reste peu fiable : c'est pourquoi le résultat réel de chaque enregistrement est aussi vérifié.
- Un échec d'ajustement reconstruisait la liste sans fermer le menu « ⋯ », laissant un écran gris — **même défaut qu'au lot 2**. Zone décidément fragile.

## Commande de push suggérée
`git push origin feat/fiabilite`
