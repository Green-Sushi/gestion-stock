# BRIEF FERMÉ — lot 3 « cohérence des commandes »

> À donner tel quel à une session `claude-local`.
> Dépôt : `/Users/lenaic-studio/Dev/Github/gestion-stock`
> Branche : `feat/coherence-commandes` (déjà créée depuis `main`, tu y es déjà)
> Fichiers à modifier : `index.html` et `app.js` UNIQUEMENT.

## RÈGLES ABSOLUES
- **NE POUSSE JAMAIS** (`git push` interdit). Ne fusionne pas. Ne touche pas à `main`.
- **JAMAIS `git stash`.** Trois fichiers non versionnés doivent rester intacts :
  `.DS_Store`, `migration-copy-frozen-data.sql`, `migration-frozen-sushi-v2.sql`.
- **NE LANCE AUCUN SOUS-AGENT.** Tu travailles seul, de bout en bout.
- **AUCUNE modification de base de données.** Aucun fichier `.sql`.
- **AUCUNE dépendance ajoutée**, aucun `<script>` ou `<link>` vers l'extérieur.
  Les polices Fredoka et Outfit sont déjà dans `fonts/` et déjà déclarées : ne les retélécharge pas.
- Ne refactorise rien qui ne soit pas listé ci-dessous. Diff minimal.
- Réponds en français.

## TÂCHE 1 — supprimer les 10 habillages écrits à la main (`index.html`)
Dix balises `<button>` portent un attribut `style="..."`. Trouve-les :
`grep -n '<button[^>]*style="' index.html`
Pour chacune, retire l'attribut `style` et remplace-le par une classe CSS que tu ajoutes
au `<style>` existant. Crée ces classes :
- `.btn-full { width: 100%; }`
- `.btn-pair { flex: 1; font-weight: 600; }`
- `.btn-success { background: #27ae60; }`
- `.btn-whatsapp { background: #25D366; font-size: 1.1rem; }`
- `.btn-email { background: #3498db; font-size: 1.1rem; }`
**Aucune couleur ne doit plus être écrite dans une balise.**

## TÂCHE 2 — ramener les arrondis à 4 valeurs (`index.html`)
Le CSS utilise dix valeurs de `border-radius` en pixels. Remplace-les ainsi :
- `10px`, `12px`, `14px` → **`13px`**
- `15px`, `16px`, `20px` → **`18px`**
- `8px` → reste **`8px`**
- `18px` → reste **`18px`**
- `3px` → **NE TOUCHE PAS** (petits traits de couleur du bandeau)
- `50%` → **NE TOUCHE PAS** (pastilles rondes)
Puis : la classe `.btn` passe en `border-radius: 999px` (forme pilule).
`.btn-small` et `.btn-icon` passent en `13px`.

## TÂCHE 3 — refondre les deux fenêtres de confirmation (`index.html`)
Concerne `#logout-modal` et `#send-confirmation-modal`.

Pour `#logout-modal` :
- Le bouton `NON` devient **`Annuler`**, le bouton `OUI` devient **`Se déconnecter`**.
- Les deux boutons sont **empilés verticalement** (le conteneur passe en `flex-direction: column; gap: 10px`).
- Ordre : **`Se déconnecter` en HAUT**, `Annuler` en DESSOUS.
- `Se déconnecter` : pilule pleine rouge `#e74c3c`, texte blanc.
- `Annuler` : pilule à contour, `background: #fff`, `color: #5b7373`, `border: 1.5px solid #d3e0e0`.
- Chaque bouton : `min-height: 48px`.

Pour `#send-confirmation-modal` : **AVANT DE RENOMMER, LIS `app.js`** pour comprendre ce que
déclenchent `send-confirmed-btn` et `send-not-confirmed-btn`. Puis renomme en respectant
exactement ce sens : le bouton qui confirme l'envoi devient **`Oui, c'est envoyé`**,
l'autre devient **`Non, pas encore`**. Même mise en forme empilée que ci-dessus, mais
le bouton d'action est vert `#27ae60` au lieu de rouge.
**NE CHANGE AUCUN COMPORTEMENT, seulement les mots et la forme.**

Les deux fenêtres passent en `border-radius: 18px`.

## TÂCHE 4 — le nom de session remplace le bouton du bandeau
Dans `index.html`, `<header>` (vers la ligne 1338) :
- **Supprime le bouton `<button id="logout-btn">Se déconnecter</button>`** en entier.
- **Supprime aussi `<div class="header-icon" id="role-icon">`** : il ferait doublon.
- Mets à la place : `<div class="session-chip" id="session-chip"></div>`
- Ajoute la classe CSS :
  `.session-chip { display:flex; align-items:center; gap:6px; background:rgba(255,255,255,.16); padding:4px 10px; border-radius:999px; font-size:.78rem; font-weight:600; color:#fff; white-space:nowrap; }`
- Supprime les règles CSS `#logout-btn` et `#logout-btn:active`, devenues inutiles.

Dans `app.js` :
- Supprime la ligne `document.getElementById('logout-btn')?.addEventListener('click', logout);`
  (garde impérativement celle de `logout-btn-settings`).
- Modifie la fonction `updateRoleIcon()` (vers la ligne 127) : au lieu d'écrire dans `#role-icon`,
  elle écrit dans `#session-chip` le texte `🔑 <nom>` si patron, `👤 <nom>` sinon.
  Le nom vient de `db.getCurrentUser()?.name`. Si le nom est absent ou vide, écris une chaîne vide.
  Ne renomme pas la fonction, ne change pas ses appels.

## TÂCHE 5 — Paramètres ouverts aux employés, sur deux blocs
Dans `app.js`, fonction `applyPermissions()` (vers la ligne 89) :
- **Retire `'settings-page'`** du tableau `patronOnlyTabs`.
Dans `index.html`, écran `#settings-page` : les blocs sont des `<div class="setting-item">`
sans identifiant. Donne un `id` aux QUATRE premiers blocs, dans cet ordre d'apparition :
1. Notifications par Email → `id="setting-email"`
2. Notifications WhatsApp → `id="setting-whatsapp"`
3. Sauvegarder les paramètres → `id="setting-save"`
4. Utilisateurs → `id="setting-users"`
**Ne touche pas** aux deux derniers blocs (Historique des envois, Déconnexion).
Puis dans `app.js`, ajoute ces quatre identifiants au tableau `patronOnlyElements` existant.

⚠️ Le bloc « Utilisateurs » affiche le code PIN de chaque compte en clair.
Son masquage est une CONDITION DE SÉCURITÉ, pas un choix de présentation.

## TÂCHE 6 — version
Remplace les 3 occurrences de `?v=20260910` par `?v=20260911` dans `index.html`.

## ZONES INTOUCHABLES — ne modifie AUCUNE de ces fonctions
`calculateStockLevel`, `updateStockOverview`, le tri des produits, `toggleProductMenu`,
`closeAllProductMenus`, `setProductMenuBackdrop`, `adjustProductQuantity`.
N'ouvre PAS la création de produits aux employés. N'ajoute aucun message de confirmation.

## VÉRIFICATIONS — lance-les toutes et donne la sortie réelle
| # | Commande | Attendu |
|---|----------|---------|
| 1 | `node --check app.js` | aucune sortie |
| 2 | `grep -c '<button[^>]*style="' index.html` | `0` |
| 3 | `grep -oE "border-radius: [0-9]+px" index.html \| sort -u` | seulement `3px`, `8px`, `13px`, `18px` |
| 4 | `grep -n "logout-btn" index.html app.js` | seul `logout-btn-settings` subsiste |
| 5 | `grep -n "role-icon" index.html app.js` | aucune sortie |
| 6 | `grep -n "settings-page" app.js` | absent de `patronOnlyTabs` |
| 7 | `grep -oE 'id="[^"]+"' index.html \| sort \| uniq -d` | aucune sortie |
| 8 | `grep -o "v=2026[0-9]*" index.html \| sort -u` | `v=20260911` seulement |
| 9 | `grep -c "fonts.googleapis\|fonts.gstatic" index.html` | `0` |
| 10 | `git status --short` | les 3 fichiers non versionnés toujours là |
| 11 | `git diff main --stat` | moins de 500 lignes modifiées |

## RENDU
1. Commit sur la branche `feat/coherence-commandes`, message en français. **Aucun push.**
2. Le tableau des 11 vérifications avec la sortie réelle de chacune.
3. Réponds à : « un employé voit-il l'onglet Paramètres ET le bloc Déconnexion ? » avec les numéros de ligne.
4. Réponds à : « un employé peut-il atteindre le bloc Utilisateurs ? » avec les numéros de ligne.
5. Rien d'autre. Pas de plan, pas de recommandation, pas d'amélioration non demandée.
