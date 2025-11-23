# 🔄 Migration des Données Existantes

Guide pour connecter vos données existantes à l'application Green Sushi

---

## 📋 Étapes de Migration

### **ÉTAPE 1 : Vérifier vos données actuelles** (2 min)

1. **Allez dans Supabase** → **SQL Editor**
2. **Cliquez sur** : **"New query"**
3. **Ouvrez** le fichier `verification-donnees-existantes.sql`
4. **Copiez tout** le contenu
5. **Collez** dans l'éditeur SQL
6. **Cliquez sur** : **"Run"**

📊 **Vous verrez plusieurs résultats :**

- Structure de vos tables (colonnes)
- Liste de vos produits existants
- Catégories utilisées
- Fournisseurs existants
- Statistiques

---

### **ÉTAPE 2 : Identifier les différences**

L'application attend ces **noms de colonnes** :

#### **Table `products`** :
- `id` (UUID)
- `name` (VARCHAR)
- `category` (VARCHAR) - **IMPORTANT** : doit être `frais`, `sec`, `surgele`, `consommable`, ou `boisson`
- `quantity` (DECIMAL)
- `unit` (VARCHAR) - ex: "kg", "L", "pièces"
- `alert_threshold` (DECIMAL) - seuil d'alerte
- `supplier_id` (UUID) - lien vers fournisseur
- `notes` (TEXT) - optionnel
- `created_at`, `updated_at` (TIMESTAMP)

#### **Table `suppliers`** :
- `id` (UUID)
- `name` (VARCHAR)
- `contact_name` (VARCHAR) - optionnel
- `phone` (VARCHAR) - optionnel
- `email` (VARCHAR) - optionnel
- `address` (TEXT) - optionnel
- `notes` (TEXT) - optionnel
- `created_at`, `updated_at` (TIMESTAMP)

---

### **ÉTAPE 3 : Adapter les catégories** (2 min)

Si vos catégories sont différentes, vous devez les normaliser.

**Exemple** : Si vous avez "Stock Frais", "FRAIS", ou "Frais", il faut tout mettre en `frais`

1. **Ouvrez** le fichier `migration-donnees-existantes.sql`

2. **Trouvez la section ÉTAPE 1** et **décommentez** les lignes nécessaires :

```sql
-- Décommentez ces lignes (enlevez les /* et */)
UPDATE products SET category = 'frais' WHERE category IN ('Frais', 'FRAIS', 'Stock Frais');
UPDATE products SET category = 'sec' WHERE category IN ('Sec', 'SEC', 'Stock Sec');
UPDATE products SET category = 'surgele' WHERE category IN ('Surgelé', 'SURGELE', 'Stock Surgelé');
UPDATE products SET category = 'consommable' WHERE category IN ('Consommable', 'Stock Consommable');
UPDATE products SET category = 'boisson' WHERE category IN ('Boisson', 'BOISSON', 'Stock Boissons');
```

3. **Adaptez** les valeurs selon vos catégories actuelles

---

### **ÉTAPE 4 : Ajouter les colonnes manquantes** (1 min)

Si certaines colonnes n'existent pas dans votre table :

1. **Dans** `migration-donnees-existantes.sql`, **section ÉTAPE 2**

2. **Décommentez** les lignes nécessaires :

```sql
-- Ajouter la colonne alert_threshold si elle n'existe pas
ALTER TABLE products ADD COLUMN IF NOT EXISTS alert_threshold DECIMAL(10, 2) DEFAULT 0;

-- Ajouter la colonne notes si elle n'existe pas
ALTER TABLE products ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ajouter la colonne unit si elle n'existe pas
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'unité';
```

---

### **ÉTAPE 5 : Définir les seuils d'alerte** (2 min)

Si vos produits n'ont pas de seuil d'alerte défini :

1. **Section ÉTAPE 3** de `migration-donnees-existantes.sql`

2. **Choisissez une méthode** :

**Option A** : Seuil automatique à 50% du stock actuel
```sql
UPDATE products
SET alert_threshold = quantity * 0.5
WHERE alert_threshold IS NULL OR alert_threshold = 0;
```

**Option B** : Seuils fixes par catégorie
```sql
UPDATE products SET alert_threshold = 10 WHERE category = 'frais';
UPDATE products SET alert_threshold = 20 WHERE category = 'sec';
UPDATE products SET alert_threshold = 5 WHERE category = 'surgele';
UPDATE products SET alert_threshold = 3 WHERE category = 'consommable';
UPDATE products SET alert_threshold = 12 WHERE category = 'boisson';
```

3. **Décommentez** l'option choisie

---

### **ÉTAPE 6 : Gérer les fournisseurs manquants** (1 min)

Si certains produits n'ont pas de fournisseur :

1. **Section ÉTAPE 4** de `migration-donnees-existantes.sql`

2. **Décommentez** pour créer un fournisseur par défaut :

```sql
-- Créer un fournisseur "Non spécifié"
INSERT INTO suppliers (name, notes)
VALUES ('Non spécifié', 'Fournisseur temporaire pour produits existants')
ON CONFLICT DO NOTHING;

-- Assigner ce fournisseur aux produits sans fournisseur
UPDATE products
SET supplier_id = (SELECT id FROM suppliers WHERE name = 'Non spécifié')
WHERE supplier_id IS NULL;
```

---

### **ÉTAPE 7 : Exécuter la migration** (1 min)

1. **Copiez** le contenu modifié de `migration-donnees-existantes.sql`
2. **Collez** dans Supabase SQL Editor
3. **Cliquez sur** : **"Run"**
4. ✅ **Vérifiez** les résultats affichés

---

### **ÉTAPE 8 : Tester dans l'application** (2 min)

1. **Rechargez** votre application (Ctrl+R / Cmd+R)
2. **Connectez-vous** avec le PIN `123456`
3. **Vérifiez** :
   - Les catégories s'affichent avec le bon nombre de produits
   - Les produits apparaissent dans les bonnes catégories
   - Les fournisseurs sont affichés
   - Les alertes stock bas fonctionnent (si quantité ≤ seuil)

---

## 🔍 Cas Spécifiques

### **Mes catégories ont des noms totalement différents**

Si vous avez des catégories comme "Légumes", "Viande", etc. :

1. **Décidez** du mapping vers les 5 catégories de l'app :
   ```
   Légumes → frais
   Viande → frais
   Épices → sec
   Glaces → surgele
   Serviettes → consommable
   Sodas → boisson
   ```

2. **Créez** vos propres commandes UPDATE :
   ```sql
   UPDATE products SET category = 'frais' WHERE category = 'Légumes';
   UPDATE products SET category = 'frais' WHERE category = 'Viande';
   UPDATE products SET category = 'sec' WHERE category = 'Épices';
   ```

### **Je veux garder mes anciennes catégories**

Vous devrez modifier l'application pour supporter vos catégories.

**Fichier à modifier** : `config.js`

```javascript
const CATEGORIES = [
    { id: 'legumes', name: 'Légumes', icon: '🥬' },
    { id: 'viande', name: 'Viande', icon: '🥩' },
    { id: 'epices', name: 'Épices', icon: '🌶️' },
    // ... vos catégories
];
```

**ET** modifier `index.html` (lignes 836-841) pour mettre vos catégories dans le select.

---

## 🆘 Problèmes Fréquents

### "Les produits ne s'affichent pas"

✅ **Vérifiez** :
- Les catégories sont bien `frais`, `sec`, `surgele`, `consommable`, `boisson` (en minuscules)
- La table `products` a bien toutes les colonnes nécessaires
- Ouvrez la console (F12) pour voir les erreurs

### "Column 'alert_threshold' does not exist"

✅ **Solution** :
```sql
ALTER TABLE products ADD COLUMN alert_threshold DECIMAL(10, 2) DEFAULT 0;
```

### "Les fournisseurs ne s'affichent pas"

✅ **Vérifiez** :
- La table `suppliers` existe
- Les produits ont un `supplier_id` valide
- Exécutez :
```sql
SELECT p.name, p.supplier_id, s.name as fournisseur
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id
LIMIT 10;
```

---

## ✅ Checklist de Migration

- [ ] Script de vérification exécuté
- [ ] Colonnes manquantes ajoutées
- [ ] Catégories normalisées
- [ ] Seuils d'alerte définis
- [ ] Fournisseurs créés/associés
- [ ] Script de migration exécuté
- [ ] Application testée
- [ ] Produits affichés correctement
- [ ] Alertes fonctionnelles

---

## 💡 Besoin d'Aide ?

Si vous avez des questions ou si votre structure est très différente, partagez-moi :

1. Le résultat de `verification-donnees-existantes.sql`
2. La structure exacte de vos tables
3. Un exemple de vos données

Je vous aiderai à créer un script de migration personnalisé ! 😊

---

**Commencez par l'ÉTAPE 1 et progressez étape par étape !** 🚀
