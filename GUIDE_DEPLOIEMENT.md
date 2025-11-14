# 📱 Guide de Déploiement - Green Sushi Gestion de Stock

Application PWA de gestion de stock pour restaurant, optimisée pour iPhone

---

## 🎯 Fonctionnalités

✅ **Authentification par code PIN** (Patron / Employé)
✅ **Gestion des produits** par catégories (Frais, Sec, Surgelé, Consommables, Boissons)
✅ **Gestion des fournisseurs** avec informations complètes
✅ **Alertes stock bas** avec notifications
✅ **Envoi par Email** et **WhatsApp**
✅ **Interface tactile** optimisée iPhone
✅ **Mode hors ligne** (PWA)
✅ **Installation sur écran d'accueil**

---

## 📋 Étapes de Déploiement

### **1️⃣ Créer un compte Supabase (GRATUIT)**

1. Allez sur [https://supabase.com](https://supabase.com)
2. Cliquez sur **"Start your project"**
3. Créez un compte (avec GitHub, Google ou Email)
4. Cliquez sur **"New Project"**
5. Remplissez les informations :
   - **Name** : `green-sushi-stock`
   - **Database Password** : Choisissez un mot de passe fort (notez-le !)
   - **Region** : Choisissez la plus proche (ex: `West EU (Ireland)`)
   - **Pricing Plan** : FREE (gratuit)
6. Cliquez sur **"Create new project"**
7. Attendez 2-3 minutes que le projet soit créé

---

### **2️⃣ Configurer la base de données**

1. Dans votre projet Supabase, cliquez sur l'icône **"SQL Editor"** dans le menu de gauche
2. Cliquez sur **"New query"**
3. Ouvrez le fichier `database-setup.sql` de votre projet
4. **Copiez TOUT le contenu** du fichier
5. **Collez-le** dans l'éditeur SQL de Supabase
6. Cliquez sur **"Run"** (en bas à droite)
7. Vous devriez voir : ✅ **"Success. No rows returned"**

---

### **3️⃣ Récupérer les clés Supabase**

1. Dans Supabase, cliquez sur l'icône **"Settings"** (⚙️) dans le menu de gauche
2. Cliquez sur **"API"**
3. Vous verrez deux informations importantes :
   - **Project URL** : `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** (clé publique) : Une longue chaîne de caractères

4. **Copiez ces deux valeurs** (vous en aurez besoin à l'étape suivante)

---

### **4️⃣ Configurer l'application**

1. Ouvrez le fichier **`config.js`** dans votre éditeur de texte
2. Remplacez les valeurs :

```javascript
const SUPABASE_CONFIG = {
    url: 'https://xxxxxxxxxxxxx.supabase.co', // ← Collez votre Project URL
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // ← Collez votre clé anon public
};
```

3. **Sauvegardez** le fichier

---

### **5️⃣ Déployer sur Vercel (GRATUIT)**

#### **Option A : Déploiement avec Git (recommandé)**

1. Créez un compte sur [https://github.com](https://github.com) si vous n'en avez pas
2. Installez [GitHub Desktop](https://desktop.github.com) ou utilisez Git en ligne de commande
3. Créez un nouveau dépôt GitHub :
   - Allez sur GitHub.com
   - Cliquez sur **"New repository"**
   - Nom : `green-sushi-stock`
   - Cochez **"Private"** (pour garder votre projet privé)
   - Cliquez sur **"Create repository"**

4. Uploadez vos fichiers sur GitHub :
   - Avec GitHub Desktop : Ajoutez votre dossier local
   - Ou uploadez manuellement les fichiers via l'interface web

5. Allez sur [https://vercel.com](https://vercel.com)
6. Cliquez sur **"Sign Up"** et connectez-vous avec GitHub
7. Cliquez sur **"Add New..."** → **"Project"**
8. Sélectionnez votre dépôt `green-sushi-stock`
9. Cliquez sur **"Deploy"**
10. Attendez 1-2 minutes

✅ **Votre application est en ligne !**

---

### **6️⃣ Installer sur iPhone**

1. Sur votre iPhone, ouvrez **Safari**
2. Allez sur l'URL de votre application (ex: `https://green-sushi-stock.vercel.app`)
3. Appuyez sur le bouton **Partager** (icône □↑)
4. Faites défiler et appuyez sur **"Sur l'écran d'accueil"**
5. Appuyez sur **"Ajouter"**

🎉 **L'application est maintenant installée comme une vraie app !**

---

## 🔐 Codes PIN par défaut

Après le premier déploiement, 2 utilisateurs sont créés :

- **Patron** : Code PIN `123456`
- **Employé** : Code PIN `000000`

⚠️ **IMPORTANT** : Changez ces codes PIN après la première connexion !

---

## 🛠️ Configuration des Notifications

### **📧 Notifications Email**

Pour activer les emails, vous devez configurer une Edge Function Supabase :

1. Dans Supabase, allez dans **"Edge Functions"**
2. Créez une nouvelle fonction `send-email`
3. Utilisez un service comme [Resend](https://resend.com) (gratuit jusqu'à 3000 emails/mois)
4. Code exemple :

```javascript
import { Resend } from 'https://esm.sh/resend@2.0.0'

const resend = new Resend('re_votre_cle_api')

Deno.serve(async (req) => {
  const { to, subject, message } = await req.json()

  const data = await resend.emails.send({
    from: 'Green Sushi <noreply@votredomaine.com>',
    to: [to],
    subject: subject,
    text: message,
  })

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### **📱 Notifications WhatsApp**

Les notifications WhatsApp ouvrent directement l'app WhatsApp avec le message pré-rempli.

1. Allez dans **Paramètres**
2. Activez **"Notifications WhatsApp"**
3. Entrez votre numéro au format international : `+596696123456`
4. Cliquez sur **"Envoyer"** dans la page Alertes
5. L'app WhatsApp s'ouvre avec le message

---

## 📊 Ajouter vos Données Initiales

### **Option 1 : Via l'interface web**

1. Connectez-vous avec le code PIN
2. Allez dans **"Fournisseurs"**
3. Ajoutez vos fournisseurs un par un
4. Allez dans une catégorie (ex: **"Stock Sec"**)
5. Ajoutez vos produits un par un

### **Option 2 : Import SQL (plus rapide)**

Si vous avez beaucoup de données, créez un fichier SQL :

```sql
-- Ajouter des fournisseurs
INSERT INTO suppliers (name, phone, email) VALUES
  ('Métro', '0596123456', 'contact@metro.fr'),
  ('Promocash', '0596234567', 'info@promocash.fr');

-- Ajouter des produits
INSERT INTO products (name, category, quantity, unit, alert_threshold, supplier_id) VALUES
  ('Riz', 'sec', 45, 'kg', 40, (SELECT id FROM suppliers WHERE name = 'Métro')),
  ('Avocat', 'frais', 20, 'pièces', 10, (SELECT id FROM suppliers WHERE name = 'Promocash'));
```

Exécutez ce script dans le **SQL Editor** de Supabase.

---

## 🔄 Mettre à Jour l'Application

Si vous modifiez des fichiers :

1. Poussez les changements sur GitHub
2. Vercel déploie automatiquement (en 1-2 minutes)
3. Rechargez la page sur votre iPhone

---

## 🆘 Dépannage

### **L'application ne charge pas**

1. Vérifiez que vous avez bien configuré `config.js` avec vos clés Supabase
2. Ouvrez la console du navigateur (F12) pour voir les erreurs
3. Vérifiez que le script SQL s'est bien exécuté

### **Les données ne se sauvegardent pas**

1. Vérifiez la connexion Supabase dans la console
2. Vérifiez que les Row Level Security policies sont activées
3. Consultez les logs dans Supabase → Logs

### **L'application ne s'installe pas sur iPhone**

1. Utilisez obligatoirement **Safari** (pas Chrome)
2. L'application doit être servie en **HTTPS** (Vercel le fait automatiquement)
3. Vérifiez que le fichier `green-sushi-manifest.json` est accessible

---

## 📱 Support

Pour toute question :
- Email : [votre-email]
- GitHub Issues : [lien vers votre repo]

---

## 📄 Licence

Application développée pour Green Sushi - Usage interne uniquement

---

## ✅ Checklist de Déploiement

- [ ] Compte Supabase créé
- [ ] Base de données initialisée (SQL exécuté)
- [ ] Clés Supabase copiées dans `config.js`
- [ ] Application déployée sur Vercel
- [ ] Application testée sur navigateur
- [ ] Application installée sur iPhone
- [ ] Connexion avec code PIN testée
- [ ] Fournisseurs ajoutés
- [ ] Produits ajoutés
- [ ] Alertes testées
- [ ] Notifications configurées

**Temps estimé total : 30-45 minutes**

---

🎉 **Félicitations ! Votre application de gestion de stock est prête !**
