# 🚀 Démarrage Rapide - Green Sushi Stock

**Guide ultra-simplifié pour non-développeurs**

---

## ⏱️ Temps estimé : 30 minutes

---

## 📝 ÉTAPE 1 : Créer votre base de données (10 min)

### 1. Aller sur Supabase
👉 **[https://supabase.com](https://supabase.com)**

### 2. Créer un compte GRATUIT
- Cliquez sur **"Start your project"**
- Inscrivez-vous avec Google ou Email

### 3. Créer un nouveau projet
- Cliquez sur **"New Project"**
- Nom : `green-sushi-stock`
- Mot de passe : **NOTEZ-LE !** (vous en aurez besoin)
- Région : **West EU (Ireland)**
- Cliquez sur **"Create new project"**
- ⏳ Attendez 2-3 minutes

### 4. Initialiser la base de données
- Dans votre projet, cliquez sur **"SQL Editor"** (à gauche)
- Cliquez sur **"New query"**
- Ouvrez le fichier `database-setup.sql` de votre ordinateur
- **Copiez TOUT** le contenu
- **Collez** dans l'éditeur Supabase
- Cliquez sur **"Run"** (bouton vert)
- ✅ Vous devriez voir "Success"

### 5. Récupérer vos clés
- Cliquez sur **"Settings"** (⚙️ en bas à gauche)
- Cliquez sur **"API"**
- **COPIEZ** ces deux valeurs :
  - ① **Project URL** (ressemble à : `https://xxxxx.supabase.co`)
  - ② **anon public** (longue chaîne de caractères)

---

## 🔧 ÉTAPE 2 : Configurer l'application (2 min)

### 1. Ouvrir le fichier config.js
- Ouvrez le fichier `config.js` avec **Bloc-notes** ou **TextEdit**

### 2. Remplacer les valeurs
```javascript
const SUPABASE_CONFIG = {
    url: 'COLLEZ_ICI_VOTRE_PROJECT_URL',
    key: 'COLLEZ_ICI_VOTRE_CLE_ANON_PUBLIC'
};
```

### 3. Sauvegarder
- **Fichier** → **Enregistrer**

---

## 🌐 ÉTAPE 3 : Mettre en ligne (15 min)

### Option A : Avec GitHub + Vercel (recommandé)

#### 1. Créer un compte GitHub
👉 **[https://github.com](https://github.com)**
- Créer un compte si vous n'en avez pas

#### 2. Télécharger GitHub Desktop
👉 **[https://desktop.github.com](https://desktop.github.com)**
- Télécharger et installer
- Se connecter avec votre compte GitHub

#### 3. Créer un dépôt
- Dans GitHub Desktop : **File** → **New Repository**
- Name : `green-sushi-stock`
- Local Path : Choisir le dossier de votre projet
- Cliquez sur **Create Repository**

#### 4. Publier sur GitHub
- Cliquez sur **"Publish repository"**
- ✅ Cochez **"Keep this code private"**
- Cliquez sur **"Publish repository"**

#### 5. Déployer sur Vercel
👉 **[https://vercel.com](https://vercel.com)**
- Cliquez sur **"Sign Up"**
- Choisir **"Continue with GitHub"**
- Autoriser Vercel
- Cliquez sur **"Add New..."** → **"Project"**
- Sélectionnez `green-sushi-stock`
- Cliquez sur **"Deploy"**
- ⏳ Attendez 1-2 minutes
- ✅ **C'EST EN LIGNE !**

#### 6. Récupérer votre URL
- Copiez l'URL affichée (ex: `https://green-sushi-stock.vercel.app`)

---

### Option B : Upload direct sur Netlify (plus simple mais moins flexible)

#### 1. Créer un compte Netlify
👉 **[https://netlify.com](https://netlify.com)**

#### 2. Glisser-déposer
- Glissez tout le dossier de votre projet sur Netlify
- ⏳ Attendez 1 minute
- ✅ **C'EST EN LIGNE !**

---

## 📱 ÉTAPE 4 : Installer sur votre iPhone (3 min)

### 1. Ouvrir Safari
⚠️ **IMPORTANT : Utilisez SAFARI, pas Chrome !**

### 2. Aller sur votre application
- Tapez l'URL de votre app (celle de Vercel ou Netlify)

### 3. Installer sur l'écran d'accueil
- Appuyez sur le bouton **Partager** (□↑ en bas au centre)
- Faites défiler vers le bas
- Appuyez sur **"Sur l'écran d'accueil"**
- Appuyez sur **"Ajouter"**

🎉 **L'ICÔNE APPARAÎT SUR VOTRE ÉCRAN D'ACCUEIL !**

---

## 🔐 ÉTAPE 5 : Première connexion (5 min)

### 1. Ouvrir l'application
- Appuyez sur l'icône Green Sushi sur votre écran d'accueil

### 2. Se connecter
- Code PIN par défaut : **`123456`** (Patron)
- Ou **`000000`** (Employé)

### 3. Ajouter vos fournisseurs
- Allez dans l'onglet **📦 Fournisseurs**
- Appuyez sur le bouton **+** (en bas à droite)
- Remplissez les informations
- **Enregistrer**

### 4. Ajouter vos produits
- Allez dans l'onglet **🏠 Accueil**
- Choisissez une catégorie (ex: Stock Sec)
- Appuyez sur le bouton **+**
- Remplissez les informations
- **Enregistrer**

### 5. Configurer les alertes
- Allez dans **⚙️ Paramètres**
- Activez les notifications Email et/ou WhatsApp
- Entrez votre email et/ou numéro WhatsApp
- Les paramètres sont sauvegardés automatiquement

---

## 🎯 UTILISATION QUOTIDIENNE

### Consulter le stock
1. Ouvrir l'app
2. Cliquer sur une catégorie
3. Voir tous les produits

### Modifier une quantité
1. Cliquer sur un produit
2. Modifier la quantité
3. **Enregistrer**

### Voir les alertes
1. Onglet **🔔 Alertes**
2. Voir tous les produits en stock bas

### Envoyer les alertes
1. Onglet **🔔 Alertes**
2. Bouton **📤 Envoyer**
3. Choisir Email ou WhatsApp

---

## 📊 IMPORTER VOS DONNÉES EN MASSE (optionnel)

Si vous avez beaucoup de produits :

### 1. Modifier le fichier exemple-donnees.sql
- Ouvrez `exemple-donnees.sql`
- Remplacez les données par les vôtres
- Sauvegardez

### 2. Exécuter dans Supabase
- Allez sur Supabase
- **SQL Editor** → **New query**
- Copiez-collez le contenu de `exemple-donnees.sql`
- **Run**
- ✅ Tous vos produits sont importés !

---

## ❓ PROBLÈMES COURANTS

### "Configuration Supabase manquante"
→ Vérifiez que vous avez bien modifié `config.js` avec vos clés

### "L'application ne s'installe pas sur iPhone"
→ Utilisez SAFARI (pas Chrome)
→ L'URL doit commencer par `https://`

### "Les données ne se sauvegardent pas"
→ Vérifiez votre connexion internet
→ Vérifiez que le script SQL s'est bien exécuté

### "Code PIN invalide"
→ Utilisez `123456` ou `000000`
→ Si vous avez changé les codes, vérifiez dans Supabase

---

## 📞 BESOIN D'AIDE ?

1. **Relisez ce guide** étape par étape
2. **Consultez le guide complet** : `GUIDE_DEPLOIEMENT.md`
3. **Contactez le support** : [votre email]

---

## ✅ CHECKLIST DE VÉRIFICATION

- [ ] Compte Supabase créé ✅
- [ ] Script SQL exécuté ✅
- [ ] Clés copiées dans config.js ✅
- [ ] Projet publié sur GitHub ✅
- [ ] Application déployée sur Vercel ✅
- [ ] URL récupérée ✅
- [ ] App installée sur iPhone ✅
- [ ] Connexion réussie ✅
- [ ] Fournisseurs ajoutés ✅
- [ ] Produits ajoutés ✅
- [ ] Alertes configurées ✅

---

🎉 **BRAVO ! Votre application de gestion de stock est opérationnelle !**

Profitez bien de votre nouvelle application ! 🍣
