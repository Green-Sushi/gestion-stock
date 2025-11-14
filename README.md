# 📱 Green Sushi - Gestion de Stock

Application web progressive (PWA) pour la gestion de stock de restaurant, optimisée pour iPhone.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-Private-red)

## 🎯 Fonctionnalités

- ✅ **Authentification sécurisée** par code PIN (6 chiffres)
- 📦 **Gestion des produits** par catégories :
  - Stock Frais 🧀
  - Stock Sec 🌾
  - Stock Surgelé ❄️
  - Stock Consommables 🥢
  - Stock Boissons 🧃
- 👥 **Gestion des fournisseurs** avec coordonnées complètes
- 🔔 **Alertes stock bas** avec seuils personnalisables
- 📧 **Notifications par Email** (configurables)
- 💬 **Notifications WhatsApp** (intégration directe)
- 📱 **PWA** installable sur écran d'accueil iPhone
- 🔄 **Synchronisation cloud** via Supabase
- 🔍 **Recherche** dans produits et fournisseurs
- 📊 **Historique des mouvements** de stock
- 👤 **Gestion des utilisateurs** (Patron / Employé)

## 🚀 Démarrage Rapide

### Prérequis

- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) (gratuit)
- Un navigateur moderne (Safari pour iPhone)

### Installation

1. **Cloner le projet**
```bash
git clone https://github.com/votre-username/gestion-stock.git
cd gestion-stock
```

2. **Configurer Supabase**
   - Créez un projet sur Supabase
   - Exécutez le script `database-setup.sql` dans le SQL Editor
   - Récupérez votre URL et clé API

3. **Configurer l'application**
   - Éditez `config.js`
   - Ajoutez vos clés Supabase

4. **Déployer**
   - Connectez votre repo à Vercel/Netlify
   - Le déploiement se fait automatiquement

📖 **Guide complet** : Consultez [GUIDE_DEPLOIEMENT.md](./GUIDE_DEPLOIEMENT.md)

## 🏗️ Architecture

```
gestion-stock/
├── index.html              # Interface principale
├── app.js                  # Logique applicative
├── database.js             # Gestion Supabase
├── config.js               # Configuration
├── database-setup.sql      # Initialisation BDD
├── green-sushi-manifest.json  # Manifest PWA
├── green-sushi-sw.js       # Service Worker
├── icon-192.png            # Icône 192x192
├── icon-512.png            # Icône 512x512
└── GUIDE_DEPLOIEMENT.md    # Guide complet
```

## 🔐 Sécurité

- **Authentification PIN** à 6 chiffres
- **Row Level Security** activé sur Supabase
- **HTTPS** obligatoire (géré par Vercel/Netlify)
- **Clés API publiques** sécurisées par RLS
- **Sessions** persistantes dans localStorage

### Codes PIN par défaut

- **Patron** : `123456`
- **Employé** : `000000`

⚠️ **Changez ces codes après la première connexion !**

## 📊 Base de Données

### Tables principales

- `users` - Utilisateurs et codes PIN
- `suppliers` - Fournisseurs
- `products` - Produits avec stocks
- `stock_movements` - Historique des mouvements
- `app_settings` - Paramètres de l'application
- `sent_alerts` - Suivi des alertes envoyées

## 🛠️ Technologies

- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Backend** : Supabase (PostgreSQL)
- **Hosting** : Vercel / Netlify
- **PWA** : Service Worker, Manifest
- **Notifications** : Email (Resend), WhatsApp Web API

## 📱 Installation sur iPhone

1. Ouvrez Safari
2. Allez sur l'URL de votre app
3. Appuyez sur **Partager** (□↑)
4. **"Sur l'écran d'accueil"**
5. **"Ajouter"**

L'application s'ouvre maintenant en plein écran comme une vraie app !

## 🔄 Mises à jour

Les mises à jour sont automatiques :
1. Modifiez vos fichiers
2. Poussez sur GitHub
3. Vercel/Netlify déploie automatiquement
4. Rechargez la page sur votre iPhone

## 📝 Utilisation

### Première connexion

1. Connectez-vous avec le code PIN patron (`123456`)
2. Allez dans **Paramètres** → **Utilisateurs**
3. Modifiez les codes PIN
4. Ajoutez vos fournisseurs
5. Ajoutez vos produits

### Gestion quotidienne

1. **Consulter le stock** : Cliquez sur une catégorie
2. **Modifier une quantité** : Cliquez sur un produit
3. **Voir les alertes** : Onglet 🔔 Alertes
4. **Envoyer alertes** : Bouton "📤 Envoyer"

## 🆘 Support

- **Email** : [votre-email]
- **Issues** : [GitHub Issues](https://github.com/votre-username/gestion-stock/issues)
- **Documentation** : [GUIDE_DEPLOIEMENT.md](./GUIDE_DEPLOIEMENT.md)

## 📄 Licence

© 2024 Green Sushi - Usage interne uniquement

---

**Développé avec ❤️ pour Green Sushi**
