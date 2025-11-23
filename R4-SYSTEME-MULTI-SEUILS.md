# R4 - Système Multi-Seuils (4 Niveaux)

## Vue d'ensemble

Implémentation du système de seuils multiples pour une meilleure gestion des alertes de stock avec 4 niveaux de couleurs :

- 🟢 **VERT (OK)** : Stock suffisant
- 🟡 **JAUNE (Attention)** : Stock commence à baisser
- 🟠 **ORANGE (Limite)** : Stock faible
- 🔴 **ROUGE (Critique)** : Stock très bas, commande urgente

## Logique des Seuils

Le système utilise 2 valeurs configurables par produit :
1. **Seuil d'alerte critique** (`alert_threshold`) : niveau minimum absolu
2. **Stock optimal** (`optimal_stock`) : quantité idéale recommandée

### Calcul Automatique des Niveaux

```javascript
if (quantité ≤ seuil_alerte) {
    → 🔴 ROUGE (critique)
} else if (quantité ≤ seuil_alerte × 2) {
    → 🟠 ORANGE (limite)
} else if (stock_optimal existe ET quantité ≤ stock_optimal × 0.5) {
    → 🟡 JAUNE (attention)
} else {
    → 🟢 VERT (OK)
}
```

### Exemple Concret

Pour un produit avec :
- Seuil d'alerte = **10 unités**
- Stock optimal = **50 unités**

Les niveaux seront :
- **0-10** : 🔴 ROUGE (critique)
- **11-20** : 🟠 ORANGE (limite)
- **21-25** : 🟡 JAUNE (attention) ← 50 × 0.5 = 25
- **26+** : 🟢 VERT (OK)

## Modifications Apportées

### 1. Base de Données

**Fichier** : `migration-optimal-stock.sql` (nouveau)

Ajoute la colonne `optimal_stock` à la table `products`.

**🚨 ACTION REQUISE** : Exécuter ce script SQL dans Supabase :

1. Ouvrir [Supabase Dashboard](https://app.supabase.com)
2. Aller dans **SQL Editor**
3. Copier-coller le contenu de `migration-optimal-stock.sql`
4. Cliquer sur **Run**

### 2. Interface Utilisateur

**Fichier** : `index.html`

#### Formulaire Produit
- Ajout du champ **Stock optimal (Vert)** optionnel
- Renommage de "Seuil d'alerte" en "Seuil d'alerte critique (Rouge)"
- Correction des catégories : `consommables` et `boissons` (au pluriel)

#### Styles CSS
- Ajout de `.stock-attention` pour le niveau JAUNE
- Couleur jaune : `#f39c12`
- Fond jaune transparent : `rgba(241, 196, 15, 0.15)`

### 3. Logique Applicative

**Fichier** : `app.js`

#### Nouvelle Fonction
```javascript
calculateStockLevel(quantity, alertThreshold, optimalStock)
```
Centralise la logique de calcul des 4 niveaux, utilisée dans :
- `renderProducts()` : affichage des produits
- `adjustProductQuantity()` : mise à jour des quantités (+/-)

#### Mises à jour
- `handleProductSubmit()` : sauvegarde du champ `optimal_stock`
- `openProductModal()` : chargement du champ `optimal_stock` en édition

### 4. Schéma BDD

**Fichier** : `database-setup.sql`

- Ajout de la colonne `optimal_stock DECIMAL(10, 2)` dans la définition de la table
- Correction du constraint `category` pour inclure `consommables` et `boissons`

## Rétrocompatibilité

✅ **Entièrement rétrocompatible** :
- Le champ `optimal_stock` est **optionnel** (peut être NULL)
- Si `optimal_stock` n'est pas renseigné, le système fonctionne comme avant avec 3 niveaux :
  - 🔴 ROUGE : quantité ≤ seuil
  - 🟠 ORANGE : quantité ≤ seuil × 2
  - 🟢 VERT : quantité > seuil × 2

## Guide d'Utilisation

### Pour les Produits Existants

1. Ouvrir un produit en édition
2. Renseigner le champ **Stock optimal (Vert)** (optionnel)
3. Exemple : si seuil = 10, mettre optimal = 40-50
4. Enregistrer

### Pour les Nouveaux Produits

Lors de la création d'un produit :
1. **Seuil d'alerte critique (Rouge)** : quantité minimale absolue (ex: 10)
2. **Stock optimal (Vert)** : quantité idéale recommandée (ex: 50)

### Recommandations

Pour de meilleurs résultats :
- `optimal_stock` devrait être **≥ alert_threshold × 3**
- Exemple : si `alert_threshold = 10`, mettre `optimal_stock = 30-50`
- Cela permet d'avoir une bonne gradation entre les niveaux

## Tests Recommandés

1. ✅ Exécuter la migration SQL dans Supabase
2. ✅ Créer un nouveau produit avec stock optimal
3. ✅ Éditer un produit existant et ajouter stock optimal
4. ✅ Tester les ajustements de quantité (+/- et +10)
5. ✅ Vérifier les 4 couleurs selon les seuils
6. ✅ Vérifier que les produits sans `optimal_stock` fonctionnent normalement

## Fichiers Modifiés

- ✏️ `index.html` : formulaire + CSS
- ✏️ `app.js` : logique 4 niveaux
- ✏️ `database-setup.sql` : schéma avec optimal_stock
- 🆕 `migration-optimal-stock.sql` : script de migration
- 🆕 `R4-SYSTEME-MULTI-SEUILS.md` : cette documentation

## Prochaines Étapes

Après avoir exécuté la migration SQL :
1. Tester l'application sur Vercel
2. Créer/modifier quelques produits pour tester les seuils
3. Valider le comportement des 4 niveaux de couleur
4. Si tout fonctionne correctement, les modifications sont prêtes pour la production
