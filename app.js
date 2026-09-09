// Application principale de gestion de stock Green Sushi

// Timestamp de démarrage pour le splash screen
const SPLASH_START_TIME = Date.now();
const SPLASH_MIN_DURATION = 3000; // 3 secondes

// État global de l'application
const AppState = {
    currentUser: null,
    currentCategory: null,
    currentPage: 'login-page',
    products: [],
    suppliers: [],
    lowStockProducts: [],
    users: [],
    editingProduct: null,
    editingSupplier: null,
    editingUser: null,
    pinCode: '',
    pendingSendConfirmation: false,
    sushiTypes: [],
    frozenSushi: [],
    editingFrozen: null,
    frozenFish: [],
    receptions: [],
    receptionsLu: undefined,
    pendingReceptionPhotos: []
};

// Adresses signées des photos de réception, en mémoire pour la session.
// Une entrée par photo (clé = storage_path) : redessiner la liste ne
// redemande jamais la même adresse.
const receptionPhotoUrlCache = new Map();

// ====================
// INITIALISATION
// ====================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialiser Supabase dès le démarrage
    showLoading(true);
    const initialized = await db.init();
    showLoading(false);

    if (!initialized) {
        alert('⚠️ Configuration Supabase manquante. Veuillez configurer SUPABASE_CONFIG dans config.js');
        hideSplashScreen();
        return;
    }

    // Vérifier si déjà connecté. On passe par db.getCurrentUser() et NON par
    // le stockage directement : c'est lui qui vérifie l'échéance de 12 h et
    // efface une session périmée. Lire le stockage à la main contournerait
    // l'expiration et la rendrait inopérante.
    const session = db.getCurrentUser();

    if (session) {
        try {
            AppState.currentUser = session;
            await initializeApp();
            hideSplashScreen();
        } catch (e) {
            showPage('login-page');
            setupLoginPage();
            hideSplashScreen();
        }
    } else {
        setupLoginPage();
        hideSplashScreen();
    }

    // Setup des event listeners globaux
    setupGlobalListeners();
});

async function initializeApp() {
    showLoading(true);

    // Charger les données (Supabase déjà initialisé au démarrage)
    await loadSuppliers();
    await loadProducts();
    await loadUsers();
    await loadSushiTypes();
    await updateAlertCount();

    // Appliquer les permissions selon le rôle
    applyPermissions();

    // Afficher l'emoji du rôle
    updateRoleIcon();

    // Afficher la page d'accueil
    showPage('home-page');
    renderCategories();

    showLoading(false);
}

// Appliquer les permissions selon le rôle utilisateur
function applyPermissions() {
    const isPatron = db.isPatron();

    // Éléments réservés au patron
    const patronOnlyElements = [
        // 'add-product-btn' retiré le 08/09/2026 : les employés peuvent
        // créer des produits. Créer est constructif, supprimer est
        // destructif — et depuis la migration de traçabilité, on sait
        // désormais qui a créé quoi. Modifier et supprimer restent au patron.
        'add-supplier-btn',         // Bouton ajouter fournisseur
        'manage-users-btn',         // Bouton gérer utilisateurs
        // Blocs de l'ecran Parametres reserves au patron. 'setting-users'
        // est le plus sensible : il affiche le code PIN de chaque compte en
        // clair, celui du patron compris.
        'setting-email',            // Bloc notifications e-mail
        'setting-whatsapp',         // Bloc notifications WhatsApp
        'setting-save',             // Bloc enregistrer les reglages
        'setting-users'             // Bloc gestion des comptes
        // 'send-alerts-btn' supprimé - accessible à tous
    ];

    // Onglets réservés au patron
    // 'settings-page' n'y figure plus : l'onglet est ouvert aux employes pour
    // qu'ils disposent d'un chemin de deconnexion. Seuls deux de ses six blocs
    // leur sont visibles ; les quatre autres sont masques ci-dessous.
    const patronOnlyTabs = [
        'suppliers-page'    // Page fournisseurs
    ];

    // Cacher/afficher les éléments selon le rôle
    patronOnlyElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = isPatron ? '' : 'none';
        }
    });

    // Cacher/afficher les onglets selon le rôle
    patronOnlyTabs.forEach(pageId => {
        const tab = document.querySelector(`.tab[data-page="${pageId}"]`);
        if (tab) {
            tab.style.display = isPatron ? '' : 'none';
        }
    });

    // Si employé, empêcher le clic sur les produits pour éditer (seulement +/-)
    // Cette logique est déjà gérée dans renderProducts car on a séparé les événements
}

// Afficher l'emoji du rôle dans le header
function updateRoleIcon() {
    const chip = document.getElementById('session-chip');
    if (!chip) return;

    const isPatron = db.isPatron();
    const name = db.getCurrentUser()?.name;

    // Sans nom, on n'affiche rien plutot qu'une pastille vide.
    if (!name) {
        chip.textContent = '';
        chip.style.display = 'none';
        return;
    }

    chip.style.display = '';
    chip.textContent = (isPatron ? '🔑 ' : '👤 ') + name;
    chip.title = isPatron ? 'Patron' : 'Salarié';
}

// ====================
// NAVIGATION
// ====================

function showPage(pageId) {
    // Masquer toutes les pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Afficher la page demandée
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        AppState.currentPage = pageId;
    }

    // L'en-tête est masqué sur l'écran de connexion : le bandeau hors-ligne
    // doit y remonter en haut plutôt que de flotter dans le vide.
    document.body.classList.toggle('sur-connexion', pageId === 'login-page');

    // Mettre à jour la navigation
    if (pageId !== 'login-page' && pageId !== 'products-page') {
        updateActiveTab(pageId);
    }

    // Masquer le header pour la page de login
    const header = document.querySelector('header');
    const nav = document.querySelector('nav');

    if (pageId === 'login-page') {
        header.style.display = 'none';
        nav.style.display = 'none';
    } else {
        header.style.display = 'flex';
        nav.style.display = 'flex';
    }

    if (pageId === 'frozen-page') {
        loadFrozenSushi().then(() => renderFrozenList());
    }

    if (pageId === 'fish-page') {
        loadFrozenFish().then(() => renderFishList());
    }

    if (pageId === 'tracabilite-page') {
        loadReceptions().then(() => renderReceptionsList());
    }
}

function updateActiveTab(pageId) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    const activeTab = document.querySelector(`.tab[data-page="${pageId}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('active');
    } else {
        loading.classList.remove('active');
    }
}

function hideSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen) return;

    // Calculer le temps écoulé depuis le début
    const elapsed = Date.now() - SPLASH_START_TIME;
    const remainingTime = Math.max(0, SPLASH_MIN_DURATION - elapsed);

    // Attendre le temps restant avant de cacher le splash screen
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        // Retirer complètement après l'animation
        setTimeout(() => {
            splashScreen.remove();
        }, 500);
    }, remainingTime);
}

// ====================
// AUTHENTIFICATION
// ====================

function setupLoginPage() {
    // Cette fonction ne fait plus rien car les listeners sont attachés globalement
    // Elle est conservée pour compatibilité
}

function updatePinDisplay() {
    for (let i = 1; i <= 6; i++) {
        const digit = document.getElementById(`pin-${i}`);
        if (i <= AppState.pinCode.length) {
            digit.textContent = '●';
            digit.classList.add('filled');
        } else {
            digit.textContent = '';
            digit.classList.remove('filled');
        }
    }
}

function logout() {
    adminPinSession = null;
    // Ouvrir la modale de confirmation
    const modal = document.getElementById('logout-modal');
    modal.classList.add('active');
}

// Ramene proprement a l'ecran de connexion, avec un message si la session a
// expire. Sans ca, l'application se degrade en silence : les menus « ⋯ »
// disparaissent et tout repond « Accès réservé au patron », sans explication
// et sans barre d'adresse pour recharger depuis l'ecran d'accueil.
function retourConnexion(message) {
    adminPinSession = null;
    db.logout();
    AppState.currentUser = null;
    AppState.pinCode = '';
    AppState.users = [];

    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    updatePinDisplay();

    const loginError = document.getElementById('login-error');
    if (loginError) loginError.textContent = message || '';

    showPage('login-page');
    updateRoleIcon();
}

// Verifie que la session est toujours valide. Appelee au retour dans
// l'application et periodiquement : l'echeance de 12 h tombe presque toujours
// pendant que l'application dort en arriere-plan, pas au demarrage.
function verifierSessionActive() {
    if (!AppState.currentUser) return;
    if (!db.getCurrentUser()) {
        retourConnexion('Session expirée, retapez votre code.');
    }
}

function confirmLogout() {
    adminPinSession = null;
    db.logout();
    AppState.currentUser = null;
    AppState.pinCode = '';

    // Réinitialiser l'affichage de la page de login
    updatePinDisplay();
    const loginError = document.getElementById('login-error');
    if (loginError) loginError.textContent = '';

    // Fermer la modale
    closeModal('logout-modal');

    showPage('login-page');
}

// ====================
// MESSAGES ET ÉTAT DU RÉSEAU
// ====================

// Affiche un message court en bas de l'écran. L'application n'en avait aucun :
// rien ne disait jamais « c'est enregistré », donc rien ne distinguait une
// saisie prise en compte d'une saisie perdue.
function notifier(message, type = 'ok', duree = 2600) {
    const zone = document.getElementById('toasts');
    if (!zone) return;

    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('role', 'status');
    el.textContent = message;
    zone.appendChild(el);

    setTimeout(() => el.remove(), duree);
}

// Vrai si le téléphone se sait hors ligne. `navigator.onLine` ment parfois
// dans l'autre sens (il se croit en ligne alors que rien ne passe) : c'est
// pourquoi on vérifie AUSSI le résultat réel de chaque enregistrement.
function estHorsLigne() {
    return navigator.onLine === false;
}

function majBandeauReseau() {
    const horsLigne = estHorsLigne();
    const bandeau = document.getElementById('bandeau-hors-ligne');
    if (bandeau) bandeau.classList.toggle('visible', horsLigne);
    // Le contenu descend au lieu d'être recouvert par le bandeau.
    document.body.classList.toggle('hors-ligne', horsLigne);
}

// Message unique pour un enregistrement qui a échoué. On distingue le réseau
// du reste : « hors ligne » se corrige tout seul, une vraie erreur non.
function signalerEchec(prefixe, erreur) {
    if (estHorsLigne()) {
        notifier('Hors ligne — ' + prefixe + ' non enregistré', 'err', 4000);
        return;
    }

    // Cas le plus fréquent en wifi faible : le téléphone SE CROIT en ligne
    // mais rien ne passe. La couche réseau renvoie alors un texte technique
    // anglais (« Failed to fetch »), incompréhensible pour l'utilisateur.
    const texte = String(erreur || '');
    const echecReseau = /failed to fetch|networkerror|network request failed|load failed|timeout/i.test(texte);

    if (echecReseau || !texte) {
        notifier(prefixe + ' non enregistré — vérifiez la connexion', 'err', 4500);
    } else {
        notifier(prefixe + ' : ' + texte, 'err', 4500);
    }
}

// ====================
// LISTENERS GLOBAUX
// ====================

function setupGlobalListeners() {
    // Navigation tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const pageId = tab.dataset.page;
            showPage(pageId);

            // Charger les données de la page
            if (pageId === 'alerts-page') {
                renderAlerts();
            } else if (pageId === 'suppliers-page') {
                renderSuppliers();
            } else if (pageId === 'settings-page') {
                loadSettings();
            } else if (pageId === 'home-page') {
                renderCategories();
            }
        });
    });

    // Bouton retour
    document.getElementById('back-to-home').addEventListener('click', () => {
        showPage('home-page');
        updateActiveTab('home-page');
        renderCategories();
    });

    // Fermeture des modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            closeModal(modalId);
        });
    });

    // Logout
    // Unique chemin de deconnexion depuis le lot 3 : le bouton du bandeau a
    // ete remplace par la pastille de session. C'est pourquoi l'onglet
    // Parametres est desormais ouvert aux employes (voir applyPermissions).
    document.getElementById('logout-btn-settings')?.addEventListener('click', logout);
    document.getElementById('confirm-logout-btn')?.addEventListener('click', confirmLogout);

    // Clavier PIN (event delegation au niveau document pour fonctionner toujours)
    document.addEventListener('click', async (e) => {
        const key = e.target.closest('.pin-key');
        if (!key) return;

        const keyValue = key.dataset.key;
        const loginError = document.getElementById('login-error');

        if (keyValue === 'delete') {
            AppState.pinCode = '';
            updatePinDisplay();
            if (loginError) loginError.textContent = '';
        } else {
            if (AppState.pinCode.length < 6) {
                AppState.pinCode += keyValue;
                updatePinDisplay();

                if (AppState.pinCode.length === 6) {
                    // Tenter la connexion
                    showLoading(true);
                    const result = await db.authenticateWithPin(AppState.pinCode);
                    showLoading(false);

                    if (result.success) {
                        AppState.currentUser = result.user;
                        AppState.pinCode = '';
                        updatePinDisplay();
                        await initializeApp();
                    } else {
                        if (loginError) loginError.textContent = '❌ Code PIN invalide';
                        AppState.pinCode = '';
                        updatePinDisplay();
                    }
                }
            }
        }
    });

    // État du réseau : bandeau permanent tant qu'il manque.
    window.addEventListener('online', () => {
        majBandeauReseau();
        notifier('Connexion rétablie', 'ok');
    });
    window.addEventListener('offline', () => {
        majBandeauReseau();
        notifier('Hors ligne — vos saisies ne partiront pas', 'err', 5000);
    });
    majBandeauReseau();

    // Surveillance de l'echeance : au retour dans l'application (le cas le
    // plus frequent : elle a dormi la nuit) et toutes les minutes.
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) verifierSessionActive();
    });
    setInterval(verifierSessionActive, 60 * 1000);

    // Menu « ⋯ » des lignes produit : un seul écouteur global pour fermer
    // le menu ouvert dès qu'on touche ailleurs (ou qu'on quitte la page).
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.product-menu-wrap')) {
            closeAllProductMenus();
        }
    });

    // Fermer aussi au défilement : sinon le menu « voyage » avec la liste,
    // détaché de sa ligne. `capture` car le défilement se produit sur un
    // conteneur interne et ne remonte pas jusqu'à document.
    document.addEventListener('scroll', () => {
        // Un appui sur iPhone s'accompagne presque toujours d'un déplacement
        // du doigt de 1 ou 2 pixels, qui produit un événement de défilement
        // dans l'instant. Sans ce garde-temps, le menu se refermait avant
        // même que l'appui sur « Modifier » ou « Supprimer » n'aboutisse.
        if (Date.now() - productMenuOpenedAt < 600) return;
        closeAllProductMenus();
    }, { capture: true, passive: true });

    // Fermeture du voile par appui direct dessus, en plus de l'écouteur
    // global ci-dessus. Porter un gestionnaire de clic suffit à rendre le
    // voile « cliquable » pour Safari iOS, qui sinon n'émettrait aucun clic
    // sur un <div> nu : l'écran resterait grisé et sans réaction.
    //
    // NE PAS ajouter d'écouteur `touchstart` ici. Fermer le voile dès le
    // toucher le fait disparaître AVANT le clic qui suit ~300 ms plus tard ;
    // ce clic serait alors dirigé vers l'élément situé dessous — donc
    // potentiellement sur « Supprimer ». C'est le « clic fantôme ».
    const menuBackdrop = document.getElementById('product-menu-backdrop');
    if (menuBackdrop) {
        menuBackdrop.addEventListener('click', closeAllProductMenus);
    }

    // Boutons d'ajout
    document.getElementById('add-product-btn').addEventListener('click', () => {
        openProductModal();
    });

    document.getElementById('add-supplier-btn').addEventListener('click', () => {
        openSupplierModal();
    });

    // Formulaires
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
    document.getElementById('supplier-form').addEventListener('submit', handleSupplierSubmit);

    // Recherche produits
    document.getElementById('product-search').addEventListener('input', (e) => {
        filterProducts(e.target.value);
    });

    // Recherche fournisseurs
    document.getElementById('supplier-search').addEventListener('input', (e) => {
        filterSuppliers(e.target.value);
    });

    // Envoi d'alertes
    document.getElementById('send-alerts-btn').addEventListener('click', sendAlerts);
    document.getElementById('send-whatsapp-btn').addEventListener('click', sendViaWhatsApp);
    document.getElementById('send-email-btn').addEventListener('click', sendViaEmail);

    // Toggles paramètres (juste toggle visuel, pas de sauvegarde auto)
    document.getElementById('email-toggle').addEventListener('click', function() {
        this.classList.toggle('active');
    });

    document.getElementById('whatsapp-toggle').addEventListener('click', function() {
        this.classList.toggle('active');
    });

    // Bouton sauvegarder paramètres
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);

    // Gestion des utilisateurs
    document.getElementById('manage-users-btn').addEventListener('click', openUsersManagement);
    document.getElementById('add-user-btn').addEventListener('click', () => openUserModal());
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);

    // Historique des messages
    document.getElementById('view-history-btn').addEventListener('click', openMessageHistory);

    // Confirmation d'envoi
    document.getElementById('send-confirmed-btn').addEventListener('click', handleSendConfirmed);
    document.getElementById('send-not-confirmed-btn').addEventListener('click', handleSendNotConfirmed);

    // Détecter le retour sur l'application après envoi
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && AppState.pendingSendConfirmation) {
            // L'utilisateur revient sur l'application
            setTimeout(() => {
                // S'assurer que la page est scrollée en haut
                window.scrollTo(0, 0);

                // Ouvrir la modale de confirmation
                const modal = document.getElementById('send-confirmation-modal');
                modal.classList.add('active');
            }, 300); // Délai réduit pour meilleure réactivité
        }
    });

    // Congélation
    document.getElementById('back-to-home-frozen').addEventListener('click', () => {
        showPage('home-page');
        updateActiveTab('home-page');
        renderCategories();
    });

    document.getElementById('add-frozen-btn').addEventListener('click', openFrozenModal);
    document.getElementById('frozen-form').addEventListener('submit', handleFrozenSubmit);
    document.getElementById('frozen-sushi-type').addEventListener('change', handleSushiTypeChange);
    document.getElementById('frozen-qty-minus').addEventListener('click', () => adjustFrozenQty(-1));
    document.getElementById('frozen-qty-plus').addEventListener('click', () => adjustFrozenQty(1));
    document.getElementById('export-frozen-btn').addEventListener('click', exportFrozenList);
    document.getElementById('frozen-filter-month').addEventListener('change', renderFrozenList);
    document.getElementById('frozen-filter-year').addEventListener('change', renderFrozenList);

    // Surgélation du poisson
    document.getElementById('back-to-home-fish').addEventListener('click', () => {
        showPage('home-page');
        updateActiveTab('home-page');
        renderCategories();
    });

    document.getElementById('add-fish-btn').addEventListener('click', openFishModal);
    document.getElementById('fish-form').addEventListener('submit', handleFishSubmit);
    document.getElementById('fish-type').addEventListener('change', handleFishTypeChange);
    document.getElementById('fish-qty-minus').addEventListener('click', () => adjustFishQty(-1));
    document.getElementById('fish-qty-plus').addEventListener('click', () => adjustFishQty(1));
    document.getElementById('export-fish-btn').addEventListener('click', exportFishList);
    document.getElementById('fish-month-filter').addEventListener('change', renderFishList);
    document.getElementById('fish-year-filter').addEventListener('change', renderFishList);

    // Traçabilité (réceptions)
    document.getElementById('back-to-home-tracabilite').addEventListener('click', () => {
        showPage('home-page');
        updateActiveTab('home-page');
        renderCategories();
    });

    document.getElementById('add-reception-btn').addEventListener('click', openReceptionModal);
    document.getElementById('reception-form').addEventListener('submit', handleReceptionSubmit);
    document.getElementById('export-reception-btn').addEventListener('click', exportReceptionList);
    document.getElementById('reception-month-filter').addEventListener('change', renderReceptionsList);
    document.getElementById('reception-year-filter').addEventListener('change', renderReceptionsList);
    document.getElementById('reception-photo-btn').addEventListener('click', () => {
        document.getElementById('reception-photo-input').click();
    });
    document.getElementById('reception-photo-input').addEventListener('change', handleReceptionPhotoInputChange);
}

// ====================
// CATÉGORIES
// ====================

function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    // Mapping des catégories vers les noms de fichiers images
    // Images en WebP : 512 px suffisent (la carte fait ~175 px, x3 sur un
    // écran d'iPhone). Les PNG d'origine faisaient 800 px et 6,8 Mo au total,
    // pour 164 Ko désormais. Ils sont conservés comme repli au cas où un
    // appareil ne lirait pas ce format — ils ne sont alors jamais téléchargés.
    const categoryImages = {
        'frais': 'frais',
        'sec': 'sec',
        'surgele': 'surgelé',
        'consommables': 'consommables',
        'boissons': 'boissons',
        'legumes': 'legumes'
    };

    CATEGORIES.forEach(category => {
        // Compter les produits de cette catégorie
        const categoryProducts = AppState.products.filter(p => p.category === category.id);

        // Compter les produits en alerte (rouge) et en limite (orange)
        let alertCount = 0;
        let warningCount = 0;
        categoryProducts.forEach(p => {
            const { stockLevel } = calculateStockLevel(p.quantity, p.alert_threshold);
            if (stockLevel === 'stock-critical') alertCount++;
            else if (stockLevel === 'stock-warning') warningCount++;
        });

        const card = document.createElement('div');
        card.className = 'category-card';
        card.dataset.category = category.id;
        card.innerHTML = `
            <img src="./images/categories/${categoryImages[category.id]}.webp"
                 onerror="this.onerror=null; this.src='./images/categories/${categoryImages[category.id]}.png';"
                 alt="${category.name}" class="category-image">
            <div class="category-badges">
                ${alertCount > 0 ? `<div class="category-badge alerts" title="${alertCount} en alerte">${alertCount}</div>` : ''}
                ${warningCount > 0 ? `<div class="category-badge warning" title="${warningCount} en limite">${warningCount}</div>` : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            AppState.currentCategory = category.id;
            showCategoryProducts(category);
        });

        container.appendChild(card);
    });

    // Carte Congélation
    const frozenCard = document.createElement('div');
    frozenCard.className = 'frozen-card';
    // L'illustration porte déjà sa légende « sushi frit », comme les six
    // autres cartes : pas de texte ajouté par-dessus, sinon il ferait doublon.
    frozenCard.innerHTML = `
<img src="./images/categories/sushi-frit.webp"
             onerror="this.onerror=null; this.src='./images/categories/sushi-frit.png';"
             alt="Sushi frit" class="category-image">
    `;
    frozenCard.addEventListener('click', () => {
        showPage('frozen-page');
    });
    container.appendChild(frozenCard);

    // Carte Surgélation du poisson — légende incluse dans l'image, pas de
    // texte ajouté par-dessus.
    const fishCard = document.createElement('div');
    fishCard.className = 'frozen-card';
    fishCard.innerHTML = `
        <img src="./images/categories/surgelation.webp" alt="Surgélation" class="category-image" onerror="this.onerror=null; this.src='./images/categories/surgelation.png';">
    `;
    fishCard.addEventListener('click', () => {
        showPage('fish-page');
    });
    container.appendChild(fishCard);

    // Carte Traçabilité — illustration fournie par l'utilisateur, légende
    // incluse dans l'image comme pour les autres cartes : aucun texte
    // ajouté par-dessus. showPage() déclenche lui-même le chargement de la
    // liste, comme pour les deux cartes ci-dessus.
    const tracabiliteCard = document.createElement('div');
    tracabiliteCard.className = 'frozen-card';
    tracabiliteCard.innerHTML = `
        <img src="./images/categories/tracabilite.webp"
             onerror="this.onerror=null; this.src='./images/categories/tracabilite.png';"
             alt="Traçabilité" class="category-image">
    `;
    tracabiliteCard.addEventListener('click', () => {
        showPage('tracabilite-page');
    });
    container.appendChild(tracabiliteCard);

    updateStockOverview();
}

// Totaliser le nombre de produits par niveau de stock pour le bandeau d'accueil
function updateStockOverview() {
    let critical = 0;
    let warning = 0;
    let ok = 0;

    AppState.products.forEach(p => {
        const { stockLevel } = calculateStockLevel(p.quantity, p.alert_threshold);
        if (stockLevel === 'stock-critical') critical++;
        else if (stockLevel === 'stock-warning') warning++;
        else ok++;
    });

    const criticalEl = document.getElementById('overview-critical');
    const warningEl = document.getElementById('overview-warning');
    const okEl = document.getElementById('overview-ok');
    if (criticalEl) criticalEl.textContent = critical;
    if (warningEl) warningEl.textContent = warning;
    if (okEl) okEl.textContent = ok;
}

function showCategoryProducts(category) {
    document.getElementById('category-title').textContent = category.name;
    showPage('products-page');
    renderProducts();
}

// ====================
// PRODUITS
// ====================

// Calculer le niveau de stock (système 3 niveaux)
function calculateStockLevel(quantity, alertThreshold) {
    let stockLevel = 'stock-ok';
    let isLowStock = false;

    if (quantity <= alertThreshold) {
        // ROUGE: stock critique (≤ seuil d'alerte)
        stockLevel = 'stock-critical';
        isLowStock = true;
    } else if (quantity <= alertThreshold * 2) {
        // ORANGE: stock en limite (≤ seuil × 2)
        stockLevel = 'stock-warning';
    }
    // Sinon VERT: stock ok

    return { stockLevel, isLowStock };
}

async function loadProducts() {
    const result = await db.getProducts();
    if (result.success) {
        AppState.products = result.data;
    }
}

function renderProducts(searchTerm = '') {
    const container = document.getElementById('products-list');
    container.innerHTML = '';

    let products = AppState.products.filter(p => p.category === AppState.currentCategory);

    // Filtrer par recherche
    if (searchTerm) {
        products = products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.supplier && p.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    // Trier par niveau de stock (rupture, puis limite, puis large), alphabétique dans chaque groupe
    const levelOrder = { 'stock-critical': 0, 'stock-warning': 1, 'stock-ok': 2 };
    products.sort((a, b) => {
        const aLevel = levelOrder[calculateStockLevel(a.quantity, a.alert_threshold).stockLevel];
        const bLevel = levelOrder[calculateStockLevel(b.quantity, b.alert_threshold).stockLevel];
        if (aLevel !== bLevel) return aLevel - bLevel;
        return a.name.localeCompare(b.name);
    });

    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-text">Aucun produit</div>
            </div>
        `;
        return;
    }

    products.forEach(product => {
        // Déterminer le niveau de stock avec le système 3 niveaux
        const { stockLevel, isLowStock } = calculateStockLevel(
            product.quantity,
            product.alert_threshold
        );

        const supplierName = product.supplier ? product.supplier.name : 'Sans fournisseur';

        const item = document.createElement('div');
        item.className = isLowStock ? 'product-item low-stock-alert' : 'product-item';

        // Menu d'actions (⋯) visible uniquement pour le Patron
        const actionMenu = db.isPatron() ?
            `<div class="product-menu-wrap">
                <button class="btn-product-menu" data-product-id="${product.id}" title="Actions">⋯</button>
                <div class="product-menu">
                    <button type="button" class="product-menu-item edit">Modifier</button>
                    <button type="button" class="product-menu-item delete">Supprimer</button>
                </div>
            </div>` : '';

        item.innerHTML = `
            <div class="product-top-row">
                <div class="product-info" data-product-id="${product.id}">
                    <div class="product-name">${product.name}</div>
                    <div class="product-supplier">${supplierName}</div>
                </div>
                ${actionMenu}
            </div>
            <div class="product-controls">
                <button class="btn-quick-adjust btn-minus" data-product-id="${product.id}" title="Retirer 1">−</button>
                <div class="product-quantity ${stockLevel}">
                    <div class="product-qty-value" id="qty-${product.id}">${product.quantity}</div>
                    <div class="product-unit">${product.unit}</div>
                </div>
                <button class="btn-quick-adjust btn-plus" data-product-id="${product.id}" title="Ajouter 1">+</button>
                <span class="btn-spacer"></span>
                <button class="btn-quick-adjust btn-plus-ten" data-product-id="${product.id}" title="Ajouter 10">+10</button>
            </div>
        `;

        // Clic sur le nom/fournisseur pour ouvrir la modale (Patron seulement)
        const productInfo = item.querySelector('.product-info');
        if (db.isPatron()) {
            productInfo.style.cursor = 'pointer';
            productInfo.addEventListener('click', () => {
                openProductModal(product);
            });
        } else {
            productInfo.style.cursor = 'default';
        }

        // Bouton moins
        const btnMinus = item.querySelector('.btn-minus');
        btnMinus.addEventListener('click', (e) => {
            e.stopPropagation();
            adjustProductQuantity(product.id, -1);
        });

        // Bouton plus
        const btnPlus = item.querySelector('.btn-plus');
        btnPlus.addEventListener('click', (e) => {
            e.stopPropagation();
            adjustProductQuantity(product.id, 1);
        });

        // Bouton +10
        const btnPlusTen = item.querySelector('.btn-plus-ten');
        btnPlusTen.addEventListener('click', (e) => {
            e.stopPropagation();
            adjustProductQuantity(product.id, 10);
        });

        // Menu d'actions ⋯ (Patron uniquement)
        if (db.isPatron()) {
            const btnMenu = item.querySelector('.btn-product-menu');
            const menu = item.querySelector('.product-menu');

            if (btnMenu && menu) {
                btnMenu.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleProductMenu(menu);
                });

                const btnEdit = menu.querySelector('.product-menu-item.edit');
                btnEdit.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeAllProductMenus();
                    openProductModal(product);
                });

                const btnDelete = menu.querySelector('.product-menu-item.delete');
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeAllProductMenus();
                    deleteProduct(product.id, product.name);
                });
            }
        }

        container.appendChild(item);
    });
}

// Menu « ⋯ » d'une ligne produit : un seul menu ouvert à la fois.
// Instant d'ouverture du dernier menu. Sert à ignorer le micro-défilement
// que produit le doigt au moment même de l'appui : sans ce délai, le menu se
// refermait aussitôt ouvert et l'appui suivant tombait dans le vide.
let productMenuOpenedAt = 0;

function toggleProductMenu(menu) {
    const wasOpen = menu.classList.contains('open');
    closeAllProductMenus();
    if (!wasOpen) {
        menu.classList.add('open');
        menu.closest('.product-item')?.classList.add('menu-open');
        setProductMenuBackdrop(true);
        productMenuOpenedAt = Date.now();
    }
}

function closeAllProductMenus() {
    document.querySelectorAll('.product-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.product-item.menu-open').forEach(i => i.classList.remove('menu-open'));
    setProductMenuBackdrop(false);
}

// Voile derrière le menu ouvert : rend l'état visible et absorbe le premier
// appui ailleurs, pour qu'un geste réflexe vers « +10 » ne tombe pas sur
// « Supprimer », que le menu recouvre.
function setProductMenuBackdrop(visible) {
    const backdrop = document.getElementById('product-menu-backdrop');
    if (backdrop) {
        backdrop.classList.toggle('open', visible);
    }
}

function filterProducts(searchTerm) {
    renderProducts(searchTerm);
}

// Ajustement rapide des quantités
async function adjustProductQuantity(productId, delta) {
    // Trouver le produit dans AppState
    const product = AppState.products.find(p => p.id === productId);
    if (!product) return;

    // Calculer la nouvelle quantité
    const oldQuantity = parseFloat(product.quantity);
    let newQuantity = oldQuantity + delta;

    // Ne pas descendre en dessous de 0
    if (newQuantity < 0) {
        newQuantity = 0;
    }

    // Mettre à jour l'affichage immédiatement (optimistic update)
    const qtyElement = document.getElementById(`qty-${productId}`);
    if (qtyElement) {
        qtyElement.textContent = newQuantity;

        // Animation visuelle renforcée
        qtyElement.style.transform = 'scale(1.3)';
        qtyElement.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        setTimeout(() => {
            qtyElement.style.transform = 'scale(1)';
        }, 300);

        // Déterminer le nouveau niveau de stock avec le système 3 niveaux
        const { stockLevel, isLowStock } = calculateStockLevel(
            newQuantity,
            product.alert_threshold
        );

        // Mettre à jour la classe du conteneur de quantité
        const qtyContainer = qtyElement.closest('.product-quantity');
        if (qtyContainer) {
            qtyContainer.className = `product-quantity ${stockLevel}`;
        }

        // Mettre à jour le fond de la carte produit
        const productItem = qtyElement.closest('.product-item');
        if (productItem) {
            if (isLowStock) {
                productItem.classList.add('low-stock-alert');
            } else {
                productItem.classList.remove('low-stock-alert');
            }
        }
    }

    // Mettre à jour dans AppState
    product.quantity = newQuantity;

    // Sauvegarder dans la base de données
    const result = await db.updateProduct(productId, { quantity: newQuantity });

    if (!result.success) {
        // L'affichage revient à l'ancienne valeur : ce que tu vois redevient
        // ce qui est réellement en base.
        product.quantity = oldQuantity;
        if (qtyElement) {
            qtyElement.textContent = oldQuantity;
        }
        // Reconstruire la liste détruit un menu « ⋯ » ouvert SANS effacer son
        // voile : l'écran resterait gris sans explication. On ferme d'abord.
        closeAllProductMenus();
        // Et on conserve le filtre de recherche en cours, sinon la liste
        // complète réapparaît alors que le champ affiche toujours son texte.
        renderProducts(document.getElementById('product-search')?.value || '');
        signalerEchec('Quantité', result.error);
    } else {
        // Mettre à jour le compteur d'alertes
        await updateAlertCount();
        // Garder le bandeau juste. On n'appelle PAS renderCategories() ici :
        // elle reconstruirait 6 balises <img> (6,8 Mo au total) sur une page
        // masquée, à chaque appui sur +/-. Les pastilles de catégorie sont
        // recalculées de toute façon aux quatre entrées dans l'accueil.
        updateStockOverview();
    }
}

// Déplacer un produit vers le haut (Patron uniquement)
// Depuis le lot 2 (interface allégée), plus aucun bouton n'appelle cette
// fonction : les flèches ↑/↓ ont été retirées de la ligne produit. La
// fonction et display_order restent en place, volontairement.
async function moveProductUp(productId) {
    if (!db.isPatron()) {
        alert('⛔ Accès réservé au patron');
        return;
    }

    showLoading(true);
    const result = await db.moveProductUp(productId);
    showLoading(false);

    if (result.success) {
        // Recharger les produits
        await loadProducts();
        renderProducts();
    } else if (result.error === 'Déjà en première position') {
        // Ne rien faire, c'est déjà en haut
    } else {
        alert('❌ Erreur lors du déplacement: ' + result.error);
    }
}

// Déplacer un produit vers le bas (Patron uniquement)
// Depuis le lot 2 (interface allégée), plus aucun bouton n'appelle cette
// fonction : les flèches ↑/↓ ont été retirées de la ligne produit. La
// fonction et display_order restent en place, volontairement.
async function moveProductDown(productId) {
    if (!db.isPatron()) {
        alert('⛔ Accès réservé au patron');
        return;
    }

    showLoading(true);
    const result = await db.moveProductDown(productId);
    showLoading(false);

    if (result.success) {
        // Recharger les produits
        await loadProducts();
        renderProducts();
    } else if (result.error === 'Déjà en dernière position') {
        // Ne rien faire, c'est déjà en bas
    } else {
        alert('❌ Erreur lors du déplacement: ' + result.error);
    }
}

// Supprimer un produit (Patron uniquement)
async function deleteProduct(productId, productName) {
    if (!db.isPatron()) {
        alert('⛔ Accès réservé au patron');
        return;
    }

    if (!confirm(`⚠️ Êtes-vous sûr de vouloir supprimer "${productName}" ?\n\nCette action est irréversible.`)) {
        return;
    }

    showLoading(true);
    const result = await db.deleteProduct(productId);
    showLoading(false);

    if (result.success) {
        notifier('Produit supprimé');
        await loadProducts();
        renderProducts();
        await updateAlertCount();
        renderCategories();
    } else {
        signalerEchec('Suppression', result.error);
    }
}

function openProductModal(product = null) {
    AppState.editingProduct = product;

    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');

    // Réinitialiser le formulaire
    form.reset();

    // Charger les fournisseurs dans le select
    const supplierSelect = document.getElementById('product-supplier');
    supplierSelect.innerHTML = '<option value="">Sélectionner...</option>';
    AppState.suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = supplier.name;
        supplierSelect.appendChild(option);
    });

    // Origine de la fiche : vide pour les produits antérieurs au 08/09/2026,
    // c'est normal et affiché comme tel.
    const auteur = document.getElementById('product-auteur');
    if (auteur) {
        const quand = product?.created_at
            ? new Date(product.created_at).toLocaleDateString('fr-FR')
            : null;

        if (product && product.created_by_name) {
            auteur.textContent = 'Ajouté par ' + product.created_by_name
                + (quand ? ' le ' + quand : '');
        } else if (product && product.created_by) {
            // Auteur enregistré mais sans nom : cas résiduel, on n'invente pas.
            auteur.textContent = quand ? 'Ajouté le ' + quand : '';
        } else if (product) {
            auteur.textContent = 'Fiche antérieure au suivi des créations';
        } else {
            auteur.textContent = '';
        }
    }

    if (product) {
        // Mode édition
        title.textContent = 'Modifier le produit';
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-supplier').value = product.supplier_id || '';
        document.getElementById('product-quantity').value = product.quantity;
        document.getElementById('product-unit').value = product.unit;
        document.getElementById('product-alert').value = product.alert_threshold;
        document.getElementById('product-optimal').value = product.optimal_stock || '';
        document.getElementById('product-notes').value = product.notes || '';
    } else {
        // Mode création
        title.textContent = 'Nouveau produit';
        // Pré-sélectionner la catégorie actuelle
        if (AppState.currentCategory) {
            document.getElementById('product-category').value = AppState.currentCategory;
        }
    }

    modal.classList.add('active');
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const productData = {
        // Nettoyé à l'enregistrement : une espace en fin de nom casse la mise
        // en gras du récapitulatif et fausse les tris alphabétiques.
        name: document.getElementById('product-name').value.trim(),
        category: document.getElementById('product-category').value,
        supplier_id: document.getElementById('product-supplier').value || null,
        quantity: parseFloat(document.getElementById('product-quantity').value),
        unit: document.getElementById('product-unit').value,
        alert_threshold: parseFloat(document.getElementById('product-alert').value),
        optimal_stock: document.getElementById('product-optimal').value ? parseFloat(document.getElementById('product-optimal').value) : null,
        notes: document.getElementById('product-notes').value
    };

    showLoading(true);

    let result;
    if (AppState.editingProduct) {
        // Mise à jour
        result = await db.updateProduct(AppState.editingProduct.id, productData);
    } else {
        // Création
        result = await db.createProduct(productData);
    }

    showLoading(false);

    if (result.success) {
        notifier(AppState.editingProduct ? 'Produit modifié' : 'Produit ajouté');
        closeModal('product-modal');
        await loadProducts();
        renderProducts();
        await updateAlertCount();
        renderCategories();
    } else {
        signalerEchec('Produit', result.error);
    }
}

// ====================
// FOURNISSEURS
// ====================

async function loadSuppliers() {
    const result = await db.getSuppliers();
    if (result.success) {
        AppState.suppliers = result.data;
    }
}

// Les comptes ne sont plus chargés au démarrage : la table est fermée et
// leur lecture exige un code patron. Ils sont chargés à l'ouverture de
// l'écran de gestion, et uniquement là.
// Code patron saisi pour la session de gestion. Volontairement gardé en
// mémoire seulement : il disparaît au rechargement de la page.
let adminPinSession = null;

async function loadUsers() {
    AppState.users = [];
}

function renderSuppliers(searchTerm = '') {
    const container = document.getElementById('suppliers-list');
    container.innerHTML = '';

    let suppliers = [...AppState.suppliers];

    // Filtrer par recherche
    if (searchTerm) {
        suppliers = suppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.contact_name && s.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    if (suppliers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-text">Aucun fournisseur</div>
            </div>
        `;
        return;
    }

    suppliers.forEach(supplier => {
        const item = document.createElement('div');
        item.className = 'list-item';

        let infoHTML = '';
        if (supplier.contact_name) infoHTML += `<div class="list-item-info">👤 ${supplier.contact_name}</div>`;
        if (supplier.phone) infoHTML += `<div class="list-item-info">📞 ${supplier.phone}</div>`;
        if (supplier.email) infoHTML += `<div class="list-item-info">✉️ ${supplier.email}</div>`;

        item.innerHTML = `
            <div class="list-item-header">
                <div class="list-item-title">${supplier.name}</div>
                <div class="list-item-actions">
                    <button class="btn btn-small btn-icon" onclick="openSupplierModal('${supplier.id}')">✏️</button>
                </div>
            </div>
            ${infoHTML}
        `;

        container.appendChild(item);
    });
}

function filterSuppliers(searchTerm) {
    renderSuppliers(searchTerm);
}

function openSupplierModal(supplierId = null) {
    const supplier = supplierId ? AppState.suppliers.find(s => s.id === supplierId) : null;
    AppState.editingSupplier = supplier;

    const modal = document.getElementById('supplier-modal');
    const title = document.getElementById('supplier-modal-title');
    const form = document.getElementById('supplier-form');

    // Réinitialiser le formulaire
    form.reset();

    if (supplier) {
        // Mode édition
        title.textContent = 'Modifier le fournisseur';
        document.getElementById('supplier-name').value = supplier.name;
        document.getElementById('supplier-contact').value = supplier.contact_name || '';
        document.getElementById('supplier-phone').value = supplier.phone || '';
        document.getElementById('supplier-email').value = supplier.email || '';
        document.getElementById('supplier-address').value = supplier.address || '';
        document.getElementById('supplier-notes').value = supplier.notes || '';
    } else {
        // Mode création
        title.textContent = 'Nouveau fournisseur';
    }

    modal.classList.add('active');
}

async function handleSupplierSubmit(e) {
    e.preventDefault();

    const supplierData = {
        name: document.getElementById('supplier-name').value,
        contact_name: document.getElementById('supplier-contact').value,
        phone: document.getElementById('supplier-phone').value,
        email: document.getElementById('supplier-email').value,
        address: document.getElementById('supplier-address').value,
        notes: document.getElementById('supplier-notes').value
    };

    showLoading(true);

    let result;
    if (AppState.editingSupplier) {
        // Mise à jour
        result = await db.updateSupplier(AppState.editingSupplier.id, supplierData);
    } else {
        // Création
        result = await db.createSupplier(supplierData);
    }

    showLoading(false);

    if (result.success) {
        notifier(AppState.editingSupplier ? 'Fournisseur modifié' : 'Fournisseur ajouté');
        closeModal('supplier-modal');
        await loadSuppliers();
        renderSuppliers();
    } else {
        signalerEchec('Fournisseur', result.error);
    }
}

// ====================
// ALERTES
// ====================

async function updateAlertCount() {
    const result = await db.getLowStockProducts();
    if (result.success) {
        AppState.lowStockProducts = result.data;
        // La pastille rouge ne compte QUE les ruptures : un compteur rouge
        // gonflé de produits non urgents perdrait son sens.
        const { ruptures } = separerNiveaux(result.data);
        document.getElementById('alert-count').textContent = ruptures.length;
    }
}

function renderAlerts() {
    const container = document.getElementById('alerts-list');
    container.innerHTML = '';

    if (AppState.lowStockProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-text">Aucune alerte stock bas</div>
            </div>
        `;
        return;
    }

    // Couleurs par catégorie
    const categoryColors = {
        'frais': '#27ae60',
        'sec': '#f39c12',
        'surgele': '#3498db',
        'consommables': '#9b59b6',
        'boissons': '#e67e22',
        'legumes': '#27ae60'
    };

    // Deux groupes distincts. Sans séparation, les produits en limite se
    // noieraient parmi les ruptures et l'écran perdrait son sens : ce qui
    // manque MAINTENANT d'un côté, ce qu'il faut prévoir de l'autre.
    const { ruptures, limites } = separerNiveaux(AppState.lowStockProducts);

    const enTete = (texte, couleur, nombre) => {
        const t = document.createElement('div');
        t.className = 'alerts-section-title';
        t.style.color = couleur;
        t.textContent = texte + ' (' + nombre + ')';
        return t;
    };

    // Trier par catégorie puis alphabétique
    const trier = (liste) => [...liste].sort((a, b) => {
        // D'abord par catégorie
        const categoryOrder = ['frais', 'sec', 'surgele', 'consommables', 'boissons', 'legumes'];
        const catIndexA = categoryOrder.indexOf(a.category);
        const catIndexB = categoryOrder.indexOf(b.category);
        if (catIndexA !== catIndexB) {
            return catIndexA - catIndexB;
        }
        // Puis alphabétique
        return a.name.localeCompare(b.name);
    });

    const groupes = [];
    if (ruptures.length > 0) groupes.push({ titre: '🔴 À commander', couleur: '#e74c3c', produits: trier(ruptures) });
    if (limites.length > 0) groupes.push({ titre: '🟠 À prévoir', couleur: '#e67e22', produits: trier(limites) });

    groupes.forEach(groupe => {
    container.appendChild(enTete(groupe.titre, groupe.couleur, groupe.produits.length));
    groupe.produits.forEach(product => {
        const categoryName = CATEGORIES.find(c => c.id === product.category)?.name || product.category;
        const borderColor = categoryColors[product.category] || '#999';

        // Déterminer le niveau de stock avec le système 3 couleurs
        const { stockLevel } = calculateStockLevel(
            product.quantity,
            product.alert_threshold
        );

        // Mapping des couleurs selon le niveau de stock
        const stockColors = {
            'stock-ok': '#27ae60',
            'stock-attention': '#f39c12',
            'stock-warning': '#e67e22',
            'stock-critical': '#e74c3c'
        };
        const stockColor = stockColors[stockLevel];

        const item = document.createElement('div');
        item.className = 'list-item alert-item';
        item.style.borderLeftColor = borderColor;
        item.innerHTML = `
            <div class="list-item-header">
                <div class="list-item-title">${product.name}</div>
                <span class="category-badge-alert" style="background-color: ${borderColor};">${categoryName}</span>
            </div>
            <div class="alert-stock-display">
                <div class="alert-stock-current" style="color: ${stockColor};">
                    <span class="alert-qty-value">${product.quantity}</span>
                    <span class="alert-qty-unit">${product.unit}</span>
                </div>
                <div class="alert-stock-threshold">
                    Seuil: ${product.alert_threshold} ${product.unit}
                </div>
            </div>
        `;

        container.appendChild(item);
    });
    });
}

// Générer le message récapitulatif formaté
// Sépare la liste en ruptures et limites. La liste contient désormais les
// deux : les limites servent à anticiper, les ruptures à commander.
function separerNiveaux(produits) {
    const ruptures = [], limites = [];
    (produits || []).forEach(p => {
        const { stockLevel } = calculateStockLevel(p.quantity, p.alert_threshold);
        if (stockLevel === 'stock-critical') ruptures.push(p);
        else if (stockLevel === 'stock-warning') limites.push(p);
    });
    return { ruptures, limites };
}


// Récapitulatif de stock. Il n'est PAS destiné aux fournisseurs mais au
// patron : c'est l'employé qui le lui envoie quand le patron n'est pas au
// restaurant. D'où le parti pris — ce qui compte est ce qu'il RESTE, pas les
// quantités à commander, que le patron évalue lui-même.
//
// `gras` vaut vrai pour WhatsApp, qui met en gras entre astérisques ; faux
// pour l'e-mail, qui part en texte brut par mailto et afficherait les
// astérisques telles quelles.
function generateAlertMessage(gras = true) {
    const dateStr = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
    });

    // WhatsApp n'applique le gras que si l'astérisque de fermeture colle au
    // dernier caractère. Un nom terminé par une espace — 15 produits sont
    // dans ce cas — affichait « *Mochi - Matcha * » en toutes lettres.
    const emphase = (t) => {
        const propre = String(t).trim();
        return gras ? '*' + propre + '*' : propre;
    };
    const nomCategorie = (id) => {
        const c = CATEGORIES.find(x => x.id === id);
        return (c ? c.name : id).replace(/^Stock /, '').toUpperCase();
    };
    // Deux décimales au plus : la base stocke des nombres à virgule.
    const quantite = (p) => Math.round(p.quantity * 100) / 100;

    const { ruptures, limites } = separerNiveaux(AppState.lowStockProducts);
    const ordre = ['frais', 'sec', 'surgele', 'consommables', 'boissons', 'legumes'];

    const bloc = (titre, produits) => {
        if (produits.length === 0) return '';
        let t = '\n' + titre + ' (' + produits.length + ')\n';
        const parCategorie = {};
        produits.forEach(p => {
            (parCategorie[p.category] = parCategorie[p.category] || []).push(p);
        });
        ordre.forEach(catId => {
            const liste = parCategorie[catId];
            if (!liste || liste.length === 0) return;
            t += '\n' + nomCategorie(catId) + '\n';
            liste.sort((a, b) => a.name.localeCompare(b.name));
            liste.forEach(p => {
                t += '\u2022 ' + emphase(p.name) + ' ' + quantite(p) + '\n';
            });
        });
        return t;
    };

    let message = emphase('STOCK') + ' \u2014 ' + dateStr + '\n';
    // Le chiffre seul est ambigu : on le dit une fois, en tête, plutôt que
    // de répéter l'unité sur chaque ligne.
    message += 'Le chiffre indique ce qu\'il reste.\n';

    message += bloc('\uD83D\uDD34 \u00C0 COMMANDER', ruptures);  // 🔴
    message += bloc('\uD83D\uDFE0 \u00C0 PR\u00C9VOIR', limites); // 🟠

    return message;
}

async function sendAlerts() {
    if (AppState.lowStockProducts.length === 0) {
        alert('ℹ️ Aucune alerte à envoyer');
        return;
    }

    // Ouvrir la modale de choix
    const modal = document.getElementById('send-choice-modal');
    modal.classList.add('active');
}

async function sendViaWhatsApp() {
    // Récupérer les paramètres
    const settings = await db.getSettings();
    if (!settings.success) {
        alert('❌ Erreur de récupération des paramètres');
        return;
    }

    const whatsappNumber = settings.data.whatsapp_number;
    if (!whatsappNumber) {
        alert('⚠️ Aucun numéro WhatsApp configuré. Veuillez configurer les paramètres.');
        return;
    }

    // WhatsApp met en gras entre astérisques.
    const message = generateAlertMessage(true);

    // Envoyer par WhatsApp
    sendWhatsAppAlert(whatsappNumber, message);

    // Fermer la modale
    closeModal('send-choice-modal');

    // Stocker les informations pour l'historique
    AppState.pendingSendData = {
        send_method: 'whatsapp',
        recipient: whatsappNumber,
        message_content: message,
        product_count: AppState.lowStockProducts.length
    };

    // Marquer qu'un envoi est en attente de confirmation
    AppState.pendingSendConfirmation = true;
}

async function sendViaEmail() {
    // Récupérer les paramètres
    const settings = await db.getSettings();
    if (!settings.success) {
        alert('❌ Erreur de récupération des paramètres');
        return;
    }

    const emailRecipient = settings.data.email_recipient;
    if (!emailRecipient) {
        alert('⚠️ Aucun email configuré. Veuillez configurer les paramètres.');
        return;
    }

    // L'e-mail part en texte brut par mailto : les astérisques y
    // apparaîtraient telles quelles.
    const message = generateAlertMessage(false);

    // Envoyer par email
    await sendEmailAlert(emailRecipient, message);

    // Fermer la modale
    closeModal('send-choice-modal');

    // Stocker les informations pour l'historique
    AppState.pendingSendData = {
        send_method: 'email',
        recipient: emailRecipient,
        message_content: message,
        product_count: AppState.lowStockProducts.length
    };

    // Marquer qu'un envoi est en attente de confirmation
    AppState.pendingSendConfirmation = true;
}

async function sendEmailAlert(email, message) {
    // Créer un mailto link avec le message
    const subject = encodeURIComponent('🚨 Alerte Stock - Green Sushi');
    const body = encodeURIComponent(message);
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    // Ouvrir le client email par défaut
    window.location.href = mailtoUrl;

    return true;
}

function sendWhatsAppAlert(number, message) {
    // Nettoyer le numéro (enlever espaces et caractères spéciaux sauf +)
    const cleanNumber = number.replace(/[^\d+]/g, '');

    // Encoder le message (encodeURIComponent standard suffit)
    const encodedMessage = encodeURIComponent(message);

    // Construire les URLs pour les différents protocoles
    const phone = cleanNumber.replace(/\+/g, '');
    const params = `phone=${phone}&text=${encodedMessage}`;

    // Tenter d'ouvrir avec les protocoles app (WhatsApp Business en premier, puis WhatsApp)
    const whatsappBusinessUrl = `whatsapp-business://send?${params}`;
    const whatsappUrl = `whatsapp://send?${params}`;

    // Créer un lien avec le protocole WhatsApp Business en premier
    const link = document.createElement('a');
    link.href = whatsappBusinessUrl;
    link.style.display = 'none';
    document.body.appendChild(link);

    // Essayer d'ouvrir WhatsApp Business
    link.click();

    // Après un court délai, essayer WhatsApp standard si WhatsApp Business n'a pas fonctionné
    setTimeout(() => {
        link.href = whatsappUrl;
        link.click();
        document.body.removeChild(link);
    }, 100);
}

async function handleSendConfirmed() {
    // Sauvegarder dans l'historique
    if (AppState.pendingSendData) {
        await db.createMessageHistory(AppState.pendingSendData);
        AppState.pendingSendData = null;
    }

    // Fermer la modale
    closeModal('send-confirmation-modal');

    // Réinitialiser l'état
    AppState.pendingSendConfirmation = false;

    // Afficher le message de succès
    alert('✅ Merci ! Le récapitulatif a bien été envoyé.');
}

function handleSendNotConfirmed() {
    // Nettoyer les données en attente
    AppState.pendingSendData = null;

    // Fermer la modale
    closeModal('send-confirmation-modal');

    // Réinitialiser l'état
    AppState.pendingSendConfirmation = false;

    // Pas de message, l'utilisateur peut réessayer
}

// ====================
// PARAMÈTRES
// ====================

async function loadSettings() {
    const result = await db.getSettings();
    if (result.success) {
        const settings = result.data;

        // Email
        const emailEnabled = settings.email_notifications === 'true';
        const emailToggle = document.getElementById('email-toggle');
        if (emailEnabled) {
            emailToggle.classList.add('active');
        } else {
            emailToggle.classList.remove('active');
        }
        document.getElementById('email-input').value = settings.email_recipient || '';

        // WhatsApp
        const whatsappEnabled = settings.whatsapp_notifications === 'true';
        const whatsappToggle = document.getElementById('whatsapp-toggle');
        if (whatsappEnabled) {
            whatsappToggle.classList.add('active');
        } else {
            whatsappToggle.classList.remove('active');
        }
        document.getElementById('whatsapp-input').value = settings.whatsapp_number || '';
    }
}

async function saveSettings() {
    const emailEnabled = document.getElementById('email-toggle').classList.contains('active');
    const emailRecipient = document.getElementById('email-input').value;
    const whatsappEnabled = document.getElementById('whatsapp-toggle').classList.contains('active');
    const whatsappNumber = document.getElementById('whatsapp-input').value;

    showLoading(true);
    // Cette fonction annonçait « sauvegardé ! » sans jamais regarder le
    // résultat : les quatre enregistrements pouvaient tous échouer, le
    // message de succès s'affichait quand même.
    const resultats = await Promise.all([
        db.updateSetting('email_notifications', emailEnabled.toString()),
        db.updateSetting('email_recipient', emailRecipient),
        db.updateSetting('whatsapp_notifications', whatsappEnabled.toString()),
        db.updateSetting('whatsapp_number', whatsappNumber)
    ]);
    showLoading(false);

    const rate = resultats.find(r => !r || !r.success);
    if (rate) {
        signalerEchec('Paramètres', rate && rate.error);
    } else {
        notifier('Paramètres enregistrés');
    }
}

// ====================
// HISTORIQUE DES MESSAGES
// ====================

async function openMessageHistory() {
    const modal = document.getElementById('message-history-modal');
    const listContainer = document.getElementById('message-history-list');

    // Afficher la modale
    modal.classList.add('active');

    // Afficher un loader
    listContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Chargement...</div>';

    // Charger l'historique
    const result = await db.getMessageHistory(100);

    if (!result.success || result.data.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Aucun message dans l\'historique</div>';
        return;
    }

    // Afficher la liste
    listContainer.innerHTML = result.data.map(message => {
        const date = new Date(message.sent_at);
        const dateStr = date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const timeStr = date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const methodBadge = message.send_method === 'whatsapp'
            ? '<span style="background: #25D366; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">WhatsApp</span>'
            : '<span style="background: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">Email</span>';

        return `
            <div class="history-item" data-message-id="${message.id}" style="
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 8px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.2s;
            " onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div>
                        <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${dateStr} à ${timeStr}</div>
                        <div style="color: #666; font-size: 0.9rem;">${message.user_name || 'Auteur non enregistré'}</div>
                    </div>
                    ${methodBadge}
                </div>
                <div style="color: #666; font-size: 0.85rem;">
                    ${message.product_count} produit${message.product_count > 1 ? 's' : ''} • ${message.recipient}
                </div>
            </div>
        `;
    }).join('');

    // Ajouter les event listeners
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const messageId = item.getAttribute('data-message-id');
            openMessageDetail(messageId);
        });
    });
}

async function openMessageDetail(messageId) {
    const modal = document.getElementById('message-detail-modal');
    const contentContainer = document.getElementById('message-detail-content');
    const infoContainer = document.getElementById('message-detail-info');

    // Afficher la modale
    modal.classList.add('active');

    // Afficher un loader
    contentContainer.innerHTML = 'Chargement...';
    infoContainer.innerHTML = '';

    // Charger le message
    const result = await db.getMessageById(messageId);

    if (!result.success) {
        contentContainer.innerHTML = 'Erreur de chargement';
        return;
    }

    const message = result.data;
    const date = new Date(message.sent_at);
    const dateStr = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Afficher le contenu
    contentContainer.textContent = message.message_content;

    // Afficher les infos
    const methodLabel = message.send_method === 'whatsapp' ? 'WhatsApp' : 'Email';
    infoContainer.innerHTML = `
        <div style="margin-bottom: 8px;"><strong>Date :</strong> ${dateStr} à ${timeStr}</div>
        <div style="margin-bottom: 8px;"><strong>Envoyé par :</strong> ${message.user_name || 'Auteur non enregistré'}</div>
        <div style="margin-bottom: 8px;"><strong>Méthode :</strong> ${methodLabel}</div>
        <div style="margin-bottom: 8px;"><strong>Destinataire :</strong> ${message.recipient}</div>
        <div><strong>Produits en alerte :</strong> ${message.product_count}</div>
    `;
}

// ====================
// GESTION DES UTILISATEURS
// ====================

async function openUsersManagement() {
    if (!db.isPatron()) {
        alert('⛔ Accès réservé au patron');
        return;
    }

    // Écran le plus sensible de l'application : on redemande le code. C'est
    // ce qui empêche quelqu'un qui a le téléphone déverrouillé de se créer
    // un compte patron. La base refuse de toute façon sans code valide.
    if (!adminPinSession) {
        const saisi = prompt('Votre code patron, pour accéder à la gestion des comptes :');
        if (!saisi) return;
        adminPinSession = saisi;
    }

    showLoading(true);
    const essai = await db.getUsers(adminPinSession);
    showLoading(false);

    if (!essai.success) {
        adminPinSession = null;
        alert('⛔ Code patron invalide');
        return;
    }

    AppState.users = essai.data;

    const modal = document.getElementById('users-management-modal');
    modal.classList.add('active');

    await renderUsersList();
}

async function renderUsersList() {
    const container = document.getElementById('users-list');
    container.innerHTML = '';

    const result = await db.getUsers(adminPinSession);
    if (!result.success) {
        // Le code garde est probablement invalide : on l'oublie pour que la
        // prochaine ouverture le redemande, au lieu d'echouer en boucle.
        adminPinSession = null;
        container.innerHTML = '<div class="empty-state-text">Code patron invalide. Fermez et rouvrez cet écran.</div>';
        return;
    }

    const users = result.data;
    AppState.users = users;

    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state-text">Aucun utilisateur</div>';
        return;
    }

    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'list-item';

        const roleText = user.role === 'patron' ? '👑 Patron' : '👤 Employé';
        const roleBadge = user.role === 'patron'
            ? '<span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">ADMIN</span>'
            : '<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">STAFF</span>';

        item.innerHTML = `
            <div class="list-item-header">
                <div>
                    <div class="list-item-title">${user.name}</div>
                    <div class="list-item-info">${roleText} • code masqué</div>
                </div>
                <div class="list-item-actions">
                    ${roleBadge}
                    <button class="btn btn-small btn-icon" onclick="openUserModal('${user.id}')">✏️</button>
                    ${user.id !== db.currentUser.id ? `<button class="btn btn-small btn-icon btn-danger" onclick="deleteUser('${user.id}')">🗑️</button>` : ''}
                </div>
            </div>
        `;

        container.appendChild(item);
    });
}

function openUserModal(userId = null) {
    const user = userId ? AppState.users?.find(u => u.id === userId) : null;
    AppState.editingUser = user;

    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');

    // Réinitialiser le formulaire
    form.reset();

    if (user) {
        // Mode édition
        title.textContent = 'Modifier l\'utilisateur';
        document.getElementById('user-name').value = user.name;
        // Le code n'est plus lisible, même par le patron. Champ laissé vide :
        // le remplir attribue un nouveau code, le laisser vide le conserve.
        document.getElementById('user-pin').value = '';
        document.getElementById('user-pin').placeholder = 'Laisser vide pour conserver le code actuel';
        document.getElementById('user-pin').required = false;
        document.getElementById('user-role').value = user.role;
    } else {
        // Mode création
        title.textContent = 'Nouvel utilisateur';
        document.getElementById('user-pin').placeholder = '6 chiffres';
        document.getElementById('user-pin').required = true;
    }

    modal.classList.add('active');
}

async function handleUserSubmit(e) {
    e.preventDefault();

    const nom = document.getElementById('user-name').value;
    const role = document.getElementById('user-role').value;
    const pinSaisi = document.getElementById('user-pin').value.trim();
    const enEdition = !!AppState.editingUser;

    // En édition, un champ vide conserve le code existant.
    if (!enEdition && !/^\d{6}$/.test(pinSaisi)) {
        alert('❌ Le code PIN doit contenir exactement 6 chiffres');
        return;
    }
    if (enEdition && pinSaisi !== '' && !/^\d{6}$/.test(pinSaisi)) {
        alert('❌ Le code PIN doit contenir exactement 6 chiffres');
        return;
    }

    showLoading(true);

    const result = await db.saveUser(adminPinSession, {
        id: enEdition ? AppState.editingUser.id : null,
        name: nom,
        role: role,
        pin: pinSaisi === '' ? null : pinSaisi
    });

    showLoading(false);

    if (result.success) {
        // Si le patron vient de changer SON PROPRE code, le code garde en
        // memoire est devenu faux : tout echouerait ensuite avec « Code patron
        // invalide », y compris le simple rafraichissement de la liste.
        const cestMoi = enEdition && AppState.editingUser.id === db.getCurrentUser()?.id;
        if (cestMoi && pinSaisi !== '') {
            adminPinSession = pinSaisi;
        }
        notifier(enEdition ? 'Compte modifié' : 'Compte créé');
        closeModal('user-modal');
        await renderUsersList();
    } else {
        signalerEchec('Compte', result.error);
    }
}

async function deleteUser(userId) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
        return;
    }

    showLoading(true);
    const result = await db.deleteUser(adminPinSession, userId);
    showLoading(false);

    if (result.success) {
        notifier('Compte supprimé');
        await renderUsersList();
    } else {
        signalerEchec('Suppression du compte', result.error);
    }
}

// ====================
// MODALES
// ====================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    AppState.editingProduct = null;
    AppState.editingSupplier = null;
    AppState.editingUser = null;
}

// Fermer les modales en cliquant en dehors
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        AppState.editingProduct = null;
        AppState.editingSupplier = null;
    }
});

// ====================
// CONGÉLATION
// ====================

async function loadSushiTypes() {
    const result = await db.getSushiTypes();
    if (result.success) {
        AppState.sushiTypes = result.data;
    }
}

async function loadFrozenSushi() {
    const result = await db.getFrozenSushi();
    if (result.success) {
        AppState.frozenSushi = result.data;
    }
}

function renderFrozenList() {
    const container = document.getElementById('frozen-list');
    const monthFilter = document.getElementById('frozen-filter-month').value;
    const yearFilter = document.getElementById('frozen-filter-year').value;

    // Initialiser le select année si vide
    const yearSelect = document.getElementById('frozen-filter-year');
    if (yearSelect.options.length <= 1) {
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '<option value="">Toutes années</option>';
        for (let y = currentYear; y >= currentYear - 3; y--) {
            yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
        }
    }

    // Filtrer les données
    let filtered = [...AppState.frozenSushi];

    if (monthFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.frozen_at);
            return String(date.getMonth() + 1).padStart(2, '0') === monthFilter;
        });
    }

    if (yearFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.frozen_at);
            return String(date.getFullYear()) === yearFilter;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🧊</div>
                <div class="empty-state-text">Aucun sushi frit enregistré</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const sushiType = item.sushi_type || {};
        const category = sushiType.category || 'frit';
        const categoryLabels = { frit: 'Frit', vegi: 'Végi', duo: 'Duo', noel: 'Noël' };
        const date = new Date(item.frozen_at);
        const dateStr = date.toLocaleDateString('fr-FR');
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const userName = item.user_name || 'Auteur non enregistré';

        return `
            <div class="frozen-item category-${category}">
                <div class="frozen-item-info">
                    <div class="frozen-item-name">
                        ${sushiType.name || 'Sushi'}
                        <span class="frozen-category-badge ${category}">${categoryLabels[category]}</span>
                    </div>
                    <div class="frozen-item-details">
                        ${item.fish_type ? `🐟 ${item.fish_type} • ` : ''}
                        📅 ${dateStr} à ${timeStr} • 👤 ${userName}
                    </div>
                </div>
                <div class="frozen-item-qty">
                    <div class="frozen-item-qty-value">${item.quantity}</div>
                    <div class="frozen-item-qty-label">pièces</div>
                </div>
            </div>
        `;
    }).join('');
}

function openFrozenModal() {
    const modal = document.getElementById('frozen-modal');
    const form = document.getElementById('frozen-form');
    const sushiSelect = document.getElementById('frozen-sushi-type');
    const datetimeInput = document.getElementById('frozen-datetime');
    const qtyInput = document.getElementById('frozen-quantity');

    // Reset form
    form.reset();
    qtyInput.value = 1;
    document.getElementById('fish-type-group').style.display = 'none';

    // Remplir le select des sushis
    sushiSelect.innerHTML = '<option value="">Sélectionner...</option>';
    AppState.sushiTypes.forEach(sushi => {
        const categoryLabels = { frit: 'Frit', vegi: 'Végi', duo: 'Duo', noel: 'Noël' };
        sushiSelect.innerHTML += `<option value="${sushi.id}">${sushi.name} (${categoryLabels[sushi.category]})</option>`;
    });

    // Pré-remplir date/heure avec maintenant
    const now = new Date();
    const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    datetimeInput.value = localDatetime;

    modal.classList.add('active');
}

function handleSushiTypeChange() {
    const sushiId = document.getElementById('frozen-sushi-type').value;
    const fishGroup = document.getElementById('fish-type-group');
    const fishSelect = document.getElementById('frozen-fish-type');

    const sushiType = AppState.sushiTypes.find(s => s.id === sushiId);

    if (sushiType && sushiType.requires_fish_selection && sushiType.available_fish) {
        fishSelect.innerHTML = '<option value="">Sélectionner...</option>';
        sushiType.available_fish.forEach(fish => {
            fishSelect.innerHTML += `<option value="${fish}">${fish}</option>`;
        });
        fishGroup.style.display = 'block';
        fishSelect.required = true;
    } else {
        fishGroup.style.display = 'none';
        fishSelect.required = false;
        fishSelect.value = '';
    }
}

function adjustFrozenQty(delta) {
    const input = document.getElementById('frozen-quantity');
    let value = parseInt(input.value) || 1;
    value = Math.max(1, value + delta);
    input.value = value;
}

async function handleFrozenSubmit(e) {
    e.preventDefault();

    const sushiTypeId = document.getElementById('frozen-sushi-type').value;
    const fishType = document.getElementById('frozen-fish-type').value || null;
    const quantity = parseInt(document.getElementById('frozen-quantity').value) || 1;
    const datetime = document.getElementById('frozen-datetime').value;

    if (!sushiTypeId) {
        alert('❌ Veuillez sélectionner un sushi');
        return;
    }

    const sushiType = AppState.sushiTypes.find(s => s.id === sushiTypeId);
    if (sushiType?.requires_fish_selection && !fishType) {
        alert('❌ Veuillez sélectionner un type de poisson');
        return;
    }

    const frozenData = {
        sushi_type_id: sushiTypeId,
        fish_type: fishType,
        quantity: quantity,
        frozen_at: datetime ? new Date(datetime).toISOString() : new Date().toISOString(),
        user_id: db.currentUser?.id
    };

    showLoading(true);
    const result = await db.createFrozenSushi(frozenData);
    showLoading(false);

    if (result.success) {
        notifier('Sushi frit enregistré');
        closeModal('frozen-modal');
        await loadFrozenSushi();
        renderFrozenList();
    } else {
        signalerEchec('Sushi frit', result.error);
    }
}

function exportFrozenList() {
    const monthFilter = document.getElementById('frozen-filter-month').value;
    const yearFilter = document.getElementById('frozen-filter-year').value;

    // Filtrer les données
    let filtered = [...AppState.frozenSushi];

    if (monthFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.frozen_at);
            return String(date.getMonth() + 1).padStart(2, '0') === monthFilter;
        });
    }

    if (yearFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.frozen_at);
            return String(date.getFullYear()) === yearFilter;
        });
    }

    if (filtered.length === 0) {
        alert('ℹ️ Aucune donnée à exporter');
        return;
    }

    // Générer le texte d'export
    const monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const periodLabel = monthFilter ? `${monthNames[parseInt(monthFilter)]} ${yearFilter || ''}` : (yearFilter || 'Tout');

    let exportText = `🧊 HISTORIQUE SUSHI FRIT - Green Sushi\n`;
    exportText += `📅 Période: ${periodLabel}\n`;
    exportText += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    filtered.forEach(item => {
        const sushiType = item.sushi_type || {};
        const date = new Date(item.frozen_at);
        const dateStr = date.toLocaleDateString('fr-FR');
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        exportText += `• ${sushiType.name || 'Sushi'}`;
        if (item.fish_type) exportText += ` (${item.fish_type})`;
        exportText += `\n  Qté: ${item.quantity} | ${dateStr} ${timeStr}\n\n`;
    });

    exportText += `━━━━━━━━━━━━━━━━━━━━\n`;
    exportText += `📊 Total: ${filtered.length} entrée(s)`;

    // Envoyer par email
    const emailRecipient = 'greensushi.mq@gmail.com';
    const subject = encodeURIComponent(`🧊 Historique Sushi Frit - ${periodLabel}`);
    const body = encodeURIComponent(exportText);
    const mailtoUrl = `mailto:${emailRecipient}?subject=${subject}&body=${body}`;

    window.location.href = mailtoUrl;
}

// ====================
// SURGÉLATION DU POISSON
// ====================

async function loadFrozenFish() {
    const result = await db.getFrozenFish();
    if (result.success) {
        AppState.frozenFish = result.data;
        AppState.frozenFishLu = true;
    } else {
        // Ne PAS laisser croire que le registre est vide alors qu'on n'a
        // simplement pas pu le lire : sur un registre sanitaire, c'est le
        // pire des messages.
        AppState.frozenFish = [];
        AppState.frozenFishLu = false;
        signalerEchec('Surgélations', result.error);
    }
}

// Distance en jours calendaires entre aujourd'hui et la date limite, sans
// tenir compte de l'heure : deux dates seulement, jamais de fuseau horaire.
function getFishExpiryStatus(expiryDate) {
    if (!expiryDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate + 'T00:00:00');
    const diffDays = Math.round((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays <= 30) return 'soon';
    return null;
}

// + 6 mois calculé sur les composants locaux de la date (année/mois/jour),
// jamais via toISOString() : une surgélation saisie en soirée en Martinique
// (UTC-4) verrait sa date basculer au lendemain une fois repassée par l'UTC.
// Ajoute des mois SANS déborder sur le mois suivant.
//
// Le comportement natif de JavaScript reporte : le 31 août + 6 mois donne
// le 3 mars, parce que février n'a pas 31 jours. Pour une date de
// péremption alimentaire, c'est le MAUVAIS sens — le poisson paraîtrait
// consommable trois jours de trop. On ramène donc au dernier jour du mois
// visé : 31 août -> 28 (ou 29) février, 31 décembre -> 30 juin.
//
// On travaille uniquement sur année / mois / jour locaux : la Martinique
// est en UTC-4, et passer par une conversion UTC ferait basculer au jour
// suivant toute saisie faite en soirée.
function addMonthsToDateOnly(date, months) {
    const annee = date.getFullYear();
    const mois = date.getMonth() + months;
    const jour = date.getDate();

    // Le jour 0 du mois suivant = dernier jour du mois visé.
    const dernierJourDuMois = new Date(annee, mois + 1, 0).getDate();
    const d = new Date(annee, mois, Math.min(jour, dernierJourDuMois));

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function renderFishList() {
    const container = document.getElementById('fish-list');
    const monthFilter = document.getElementById('fish-month-filter').value;
    const yearFilter = document.getElementById('fish-year-filter').value;

    // Initialiser le select année si vide
    const yearSelect = document.getElementById('fish-year-filter');
    if (yearSelect.options.length <= 1) {
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '<option value="">Toutes années</option>';
        for (let y = currentYear; y >= currentYear - 3; y--) {
            yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
        }
    }

    // Filtrer les données
    let filtered = [...AppState.frozenFish];

    if (monthFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.frozen_at);
            return String(date.getMonth() + 1).padStart(2, '0') === monthFilter;
        });
    }

    if (yearFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.frozen_at);
            return String(date.getFullYear()) === yearFilter;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${AppState.frozenFishLu === false ? '⚠️' : '🐟'}</div>
                <div class="empty-state-text">${AppState.frozenFishLu === false
                    ? 'Lecture impossible — vérifiez la connexion'
                    : 'Aucune surgélation enregistrée'}</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const date = new Date(item.frozen_at);
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const expiryStr = item.expiry_date
            ? new Date(item.expiry_date + 'T00:00:00').toLocaleDateString('fr-FR')
            : '—';

        const status = getFishExpiryStatus(item.expiry_date);
        let badge = '';
        if (status === 'expired') badge = '<span class="frozen-category-badge expired">Expiré</span>';
        else if (status === 'soon') badge = '<span class="frozen-category-badge soon">Expire bientôt</span>';

        return `
            <div class="frozen-item">
                <div class="frozen-item-info">
                    <div class="frozen-item-name">
                        ${item.fish_type || 'Poisson'}
                        ${badge}
                    </div>
                    <div class="frozen-item-details">
                        Surgelé le ${dateStr} · limite ${expiryStr}
                        ${item.note ? ` · ${item.note}` : ''}
                    </div>
                </div>
                <div class="frozen-item-actions">
                    <div class="frozen-item-qty">
                        <div class="frozen-item-qty-value">${item.quantity}</div>
                        <div class="frozen-item-qty-label">${item.unit}</div>
                    </div>
                    <button type="button" class="btn btn-small btn-icon btn-danger" onclick="deleteFrozenFish('${item.id}')" title="Supprimer">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function openFishModal() {
    const modal = document.getElementById('fish-modal');
    const form = document.getElementById('fish-form');
    const datetimeInput = document.getElementById('fish-datetime');
    const qtyInput = document.getElementById('fish-quantity');

    // Reset form
    form.reset();
    qtyInput.value = 1;
    document.getElementById('fish-type-other-group').style.display = 'none';
    document.getElementById('fish-type-other').required = false;

    // Pré-remplir date/heure avec maintenant
    const now = new Date();
    const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    datetimeInput.value = localDatetime;

    modal.classList.add('active');
}

function handleFishTypeChange() {
    const type = document.getElementById('fish-type').value;
    const otherGroup = document.getElementById('fish-type-other-group');
    const otherInput = document.getElementById('fish-type-other');

    if (type === 'Autre') {
        otherGroup.style.display = 'block';
        otherInput.required = true;
    } else {
        otherGroup.style.display = 'none';
        otherInput.required = false;
        otherInput.value = '';
    }
}

function adjustFishQty(delta) {
    const input = document.getElementById('fish-quantity');
    let value = parseInt(input.value) || 1;
    value = Math.max(1, value + delta);
    input.value = value;
}

async function handleFishSubmit(e) {
    e.preventDefault();

    const fishTypeSelect = document.getElementById('fish-type').value;
    const fishTypeOther = document.getElementById('fish-type-other').value.trim();
    const quantity = parseInt(document.getElementById('fish-quantity').value) || 1;
    const unit = document.getElementById('fish-unit').value;
    const datetime = document.getElementById('fish-datetime').value;
    const note = document.getElementById('fish-note').value.trim();

    if (!fishTypeSelect) {
        notifier('Sélectionnez un poisson', 'err');
        return;
    }

    if (fishTypeSelect === 'Autre' && !fishTypeOther) {
        notifier('Précisez le poisson', 'err');
        return;
    }

    const fishType = fishTypeSelect === 'Autre' ? fishTypeOther : fishTypeSelect;
    const frozenAt = datetime ? new Date(datetime) : new Date();

    const fishData = {
        fish_type: fishType,
        quantity: quantity,
        unit: unit,
        note: note || null,
        frozen_at: frozenAt.toISOString(),
        expiry_date: addMonthsToDateOnly(frozenAt, 6),
        user_id: db.currentUser?.id
    };

    showLoading(true);
    const result = await db.createFrozenFish(fishData);
    showLoading(false);

    if (result.success) {
        notifier('Surgélation enregistrée');
        closeModal('fish-modal');
        await loadFrozenFish();
        renderFishList();
    } else {
        signalerEchec('Surgélation', result.error);
    }
}

async function deleteFrozenFish(id) {
    const entree = (AppState.frozenFish || []).find(f => f.id === id);
    const quoi = entree
        ? `${entree.fish_type} — ${entree.quantity} ${entree.unit}, surgelé le ` +
          new Date(entree.frozen_at).toLocaleDateString('fr-FR')
        : 'cette entrée';

    if (!confirm(`⚠️ Supprimer définitivement :\n\n${quoi}\n\nCette ligne du registre sera perdue.`)) {
        return;
    }

    showLoading(true);
    const result = await db.deleteFrozenFish(id);
    showLoading(false);

    if (result.success) {
        notifier('Surgélation supprimée');
        await loadFrozenFish();
        renderFishList();
    } else {
        signalerEchec('Suppression', result.error);
    }
}

function exportFishList() {
    const monthFilter = document.getElementById('fish-month-filter').value;
    const yearFilter = document.getElementById('fish-year-filter').value;

    // Filtrer les données
    let filtered = [...AppState.frozenFish];

    if (monthFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.frozen_at);
            return String(date.getMonth() + 1).padStart(2, '0') === monthFilter;
        });
    }

    if (yearFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.frozen_at);
            return String(date.getFullYear()) === yearFilter;
        });
    }

    if (filtered.length === 0) {
        notifier('Aucune donnée à exporter', 'err');
        return;
    }

    // Générer le texte d'export
    const monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const periodLabel = monthFilter ? `${monthNames[parseInt(monthFilter)]} ${yearFilter || ''}` : (yearFilter || 'Tout');

    let exportText = `🐟 HISTORIQUE SURGÉLATION POISSON - Green Sushi\n`;
    exportText += `📅 Période: ${periodLabel}\n`;
    exportText += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    filtered.forEach(item => {
        const date = new Date(item.frozen_at);
        const dateStr = date.toLocaleDateString('fr-FR');
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const expiryStr = item.expiry_date
            ? new Date(item.expiry_date + 'T00:00:00').toLocaleDateString('fr-FR')
            : '—';

        exportText += `• ${item.fish_type || 'Poisson'}\n`;
        exportText += `  Qté: ${item.quantity} ${item.unit} | ${dateStr} ${timeStr} | limite ${expiryStr}\n`;
        if (item.note) exportText += `  Note: ${item.note}\n`;
        exportText += `\n`;
    });

    exportText += `━━━━━━━━━━━━━━━━━━━━\n`;
    exportText += `📊 Total: ${filtered.length} entrée(s)`;

    // Envoyer par email
    const emailRecipient = 'greensushi.mq@gmail.com';
    const subject = encodeURIComponent(`🐟 Historique Surgélation Poisson - ${periodLabel}`);
    const body = encodeURIComponent(exportText);
    const mailtoUrl = `mailto:${emailRecipient}?subject=${subject}&body=${body}`;

    window.location.href = mailtoUrl;
}

// ====================
// TRAÇABILITÉ (RÉCEPTIONS)
// ====================

// Compresse une photo AVANT tout envoi (photo iPhone ~3 Mo -> ~300 Ko visés,
// sinon l'espace gratuit Supabase, 1 Go, serait plein en 300 photos au lieu
// de 3 000). Redimensionne au plus grand côté 1600 px (jamais d'agrandissement
// d'une image plus petite), exporte en JPEG qualité 0.8. Si la compression
// échoue, renvoie le fichier D'ORIGINE plutôt que de perdre la photo —
// `compressee: false` permet à l'appelant de prévenir l'utilisateur.
function compresserImage(fichier) {
    return new Promise((resolve) => {
        const TAILLE_MAX = 1600;
        let url;

        const echec = () => {
            if (url) URL.revokeObjectURL(url);
            resolve({ blob: fichier, compressee: false });
        };

        try {
            url = URL.createObjectURL(fichier);
        } catch (e) {
            resolve({ blob: fichier, compressee: false });
            return;
        }

        const image = new Image();
        image.onload = () => {
            try {
                let { width, height } = image;
                const plusGrandCote = Math.max(width, height);

                if (plusGrandCote > TAILLE_MAX) {
                    const ratio = TAILLE_MAX / plusGrandCote;
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { echec(); return; }
                ctx.drawImage(image, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    if (blob) {
                        resolve({ blob, compressee: true });
                    } else {
                        resolve({ blob: fichier, compressee: false });
                    }
                }, 'image/jpeg', 0.8);
            } catch (e) {
                echec();
            }
        };
        image.onerror = echec;
        image.src = url;
    });
}

// Renvoie l'adresse signée d'une photo, mise en cache pour ne pas la
// redemander à chaque redessin de la liste.
//
// L'adresse expire au bout d'1 h côté Supabase, alors qu'une session dure
// 12 h : un cache qui ne vieillirait jamais afficherait des vignettes
// mortes tout l'après-midi. On la considère donc périmée au bout de
// 50 minutes, avec 10 minutes de marge avant l'expiration réelle.
const DUREE_ADRESSE_PHOTO_MS = 50 * 60 * 1000;

async function getCachedPhotoUrl(storagePath) {
    const enCache = receptionPhotoUrlCache.get(storagePath);
    if (enCache && (Date.now() - enCache.obtenueA) < DUREE_ADRESSE_PHOTO_MS) {
        return enCache.url;
    }

    const result = await db.getPhotoUrl(storagePath);
    if (result.success) {
        receptionPhotoUrlCache.set(storagePath, { url: result.data, obtenueA: Date.now() });
        return result.data;
    }

    // En cas d'échec, mieux vaut une adresse périmée que rien : l'image
    // s'affichera peut-être encore, et on réessaiera au prochain passage.
    return enCache ? enCache.url : null;
}

async function loadReceptions() {
    const result = await db.getReceptions();
    if (result.success) {
        AppState.receptions = result.data;
        AppState.receptionsLu = true;
    } else {
        // Ne PAS laisser croire que le registre est vide alors qu'on n'a
        // simplement pas pu le lire : sur un registre sanitaire, c'est le
        // pire des messages.
        AppState.receptions = [];
        AppState.receptionsLu = false;
        signalerEchec('Réceptions', result.error);
    }
}

function renderReceptionsList() {
    const container = document.getElementById('receptions-list');
    const monthFilter = document.getElementById('reception-month-filter').value;
    const yearFilter = document.getElementById('reception-year-filter').value;

    // Initialiser le select année si vide
    const yearSelect = document.getElementById('reception-year-filter');
    if (yearSelect.options.length <= 1) {
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '<option value="">Toutes années</option>';
        for (let y = currentYear; y >= currentYear - 3; y--) {
            yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
        }
    }

    let filtered = [...(AppState.receptions || [])];

    if (monthFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.received_at);
            return String(date.getMonth() + 1).padStart(2, '0') === monthFilter;
        });
    }

    if (yearFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.received_at);
            return String(date.getFullYear()) === yearFilter;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${AppState.receptionsLu === false ? '⚠️' : '📋'}</div>
                <div class="empty-state-text">${AppState.receptionsLu === false
                    ? 'Lecture impossible — vérifiez la connexion'
                    : 'Aucune réception enregistrée'}</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const date = new Date(item.received_at);
        const dateStr = date.toLocaleDateString('fr-FR');
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const photos = item.photos || [];
        const supplierLabel = item.supplier_name || 'Non précisé';

        const photosHtml = photos.length > 0
            ? `<div class="reception-photos-row">` + photos.map(p =>
                `<img class="reception-photo-thumb-view" data-storage-path="${p.storage_path}" alt="Photo réception">`
              ).join('') + `</div>`
            : '';

        return `
            <div class="list-item reception-item">
                <div class="list-item-header">
                    <div class="list-item-title">${supplierLabel}</div>
                    <div class="list-item-actions">
                        <button type="button" class="btn btn-small btn-icon btn-danger" onclick="deleteReception('${item.id}')" title="Supprimer">🗑️</button>
                    </div>
                </div>
                <div class="list-item-info">📅 ${dateStr} à ${timeStr}</div>
                ${item.note ? `<div class="list-item-info">📝 ${item.note}</div>` : ''}
                <div class="list-item-info">🖼️ ${photos.length} photo${photos.length > 1 ? 's' : ''}</div>
                ${photosHtml}
            </div>
        `;
    }).join('');

    // Résoudre les vignettes : une adresse signée demandée au plus une fois
    // par photo (voir getCachedPhotoUrl), même si cette liste est redessinée.
    container.querySelectorAll('.reception-photo-thumb-view').forEach((img) => {
        const storagePath = img.dataset.storagePath;
        getCachedPhotoUrl(storagePath).then(url => {
            if (url) img.src = url;
        });
        img.addEventListener('click', () => openPhotoViewer(storagePath));
    });
}

async function openPhotoViewer(storagePath) {
    const modal = document.getElementById('photo-viewer-modal');
    const img = document.getElementById('photo-viewer-image');
    img.src = '';
    modal.classList.add('active');

    const url = await getCachedPhotoUrl(storagePath);
    if (url) {
        img.src = url;
    } else {
        notifier('Photo introuvable', 'err');
        closeModal('photo-viewer-modal');
    }
}

function renderReceptionPhotoPreview() {
    const container = document.getElementById('reception-photo-preview');
    container.innerHTML = AppState.pendingReceptionPhotos.map((p, index) => `
        <div class="reception-photo-thumb">
            <img src="${p.previewUrl}" alt="Photo à envoyer">
            <button type="button" class="reception-photo-remove" data-index="${index}" title="Retirer">×</button>
        </div>
    `).join('');

    container.querySelectorAll('.reception-photo-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index, 10);
            const [removed] = AppState.pendingReceptionPhotos.splice(index, 1);
            if (removed) URL.revokeObjectURL(removed.previewUrl);
            renderReceptionPhotoPreview();
        });
    });
}

function handleReceptionPhotoInputChange(e) {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
        AppState.pendingReceptionPhotos.push({
            file,
            previewUrl: URL.createObjectURL(file)
        });
    });
    renderReceptionPhotoPreview();
    // Vide l'input : sans ça, resélectionner exactement le même fichier ne
    // redéclenche pas l'événement 'change'.
    e.target.value = '';
}

function openReceptionModal() {
    const modal = document.getElementById('reception-modal');
    const form = document.getElementById('reception-form');
    const supplierSelect = document.getElementById('reception-supplier');
    const datetimeInput = document.getElementById('reception-datetime');

    form.reset();

    AppState.pendingReceptionPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    AppState.pendingReceptionPhotos = [];
    renderReceptionPhotoPreview();

    const progressEl = document.getElementById('reception-upload-progress');
    progressEl.style.display = 'none';
    progressEl.textContent = '';

    supplierSelect.innerHTML = '<option value="">Non précisé</option>';
    AppState.suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = supplier.name;
        supplierSelect.appendChild(option);
    });

    const now = new Date();
    const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    datetimeInput.value = localDatetime;

    modal.classList.add('active');
}

// Crée d'abord la réception, PUIS envoie les photos une par une. Si une
// photo échoue, la réception reste enregistrée — elle ne doit jamais être
// perdue à cause d'une photo. Fermer la fenêtre pendant l'envoi ne l'annule
// pas : la boucle continue en arrière-plan jusqu'à son terme, seule la
// barre de progression cesse d'être visible.
async function handleReceptionSubmit(e) {
    e.preventDefault();

    const supplierId = document.getElementById('reception-supplier').value || null;
    const supplier = supplierId ? AppState.suppliers.find(s => s.id === supplierId) : null;
    const datetime = document.getElementById('reception-datetime').value;
    const note = document.getElementById('reception-note').value.trim();
    const photosASayer = [...AppState.pendingReceptionPhotos];

    const submitBtn = document.getElementById('reception-submit-btn');
    const progressEl = document.getElementById('reception-upload-progress');

    const receptionData = {
        supplier_id: supplierId,
        // Recopié depuis le fournisseur sélectionné, tel qu'il est
        // actuellement chargé dans AppState.suppliers : un fournisseur
        // renommé ou supprimé plus tard ne doit pas réécrire cette réception.
        supplier_name: supplier ? supplier.name : null,
        note: note || null,
        received_at: datetime ? new Date(datetime).toISOString() : new Date().toISOString(),
        user_id: db.currentUser?.id
    };

    submitBtn.disabled = true;
    showLoading(true);
    const result = await db.createReception(receptionData);
    showLoading(false);

    if (!result.success) {
        submitBtn.disabled = false;
        signalerEchec('Réception', result.error);
        return;
    }

    const receptionId = result.data.id;

    let envoyees = 0;
    let compressionEchouee = false;
    if (photosASayer.length > 0) {
        progressEl.style.display = 'block';
        for (let i = 0; i < photosASayer.length; i++) {
            progressEl.textContent = `Envoi de la photo ${i + 1} sur ${photosASayer.length}…`;
            const { blob, compressee } = await compresserImage(photosASayer[i].file);
            if (!compressee) compressionEchouee = true;
            const uploadResult = await db.uploadReceptionPhoto(receptionId, blob);
            if (uploadResult.success) envoyees++;
        }
        progressEl.style.display = 'none';
        progressEl.textContent = '';
    }

    submitBtn.disabled = false;

    AppState.pendingReceptionPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    AppState.pendingReceptionPhotos = [];

    closeModal('reception-modal');

    if (compressionEchouee) {
        notifier('Compression impossible pour une photo — envoi de l\'original', 'info', 4000);
    }

    if (photosASayer.length > 0 && envoyees < photosASayer.length) {
        notifier(`Réception enregistrée — ${envoyees} photo${envoyees > 1 ? 's' : ''} sur ${photosASayer.length} envoyée${envoyees > 1 ? 's' : ''}`, 'err', 5000);
    } else {
        notifier('Réception enregistrée');
    }

    await loadReceptions();
    renderReceptionsList();
}

async function deleteReception(id) {
    const entree = (AppState.receptions || []).find(r => r.id === id);
    const photoCount = entree?.photos?.length || 0;
    const quoi = entree
        ? `${entree.supplier_name || 'Non précisé'} — ` +
          new Date(entree.received_at).toLocaleDateString('fr-FR') +
          (photoCount > 0 ? ` (${photoCount} photo${photoCount > 1 ? 's' : ''} perdue${photoCount > 1 ? 's' : ''})` : '')
        : 'cette réception';

    if (!confirm(`⚠️ Supprimer définitivement :\n\n${quoi}\n\nCette ligne du registre sera perdue.`)) {
        return;
    }

    showLoading(true);
    const result = await db.deleteReception(id);
    showLoading(false);

    if (result.success) {
        notifier('Réception supprimée');
        await loadReceptions();
        renderReceptionsList();
    } else {
        signalerEchec('Suppression', result.error);
    }
}

function exportReceptionList() {
    const monthFilter = document.getElementById('reception-month-filter').value;
    const yearFilter = document.getElementById('reception-year-filter').value;

    let filtered = [...(AppState.receptions || [])];

    if (monthFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.received_at);
            return String(date.getMonth() + 1).padStart(2, '0') === monthFilter;
        });
    }

    if (yearFilter) {
        filtered = filtered.filter(item => {
            const date = new Date(item.received_at);
            return String(date.getFullYear()) === yearFilter;
        });
    }

    if (filtered.length === 0) {
        notifier('Aucune donnée à exporter', 'err');
        return;
    }

    const monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const periodLabel = monthFilter ? `${monthNames[parseInt(monthFilter)]} ${yearFilter || ''}` : (yearFilter || 'Tout');

    let exportText = `📋 HISTORIQUE TRAÇABILITÉ - Green Sushi\n`;
    exportText += `📅 Période: ${periodLabel}\n`;
    exportText += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    filtered.forEach(item => {
        const date = new Date(item.received_at);
        const dateStr = date.toLocaleDateString('fr-FR');
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const photoCount = (item.photos || []).length;

        exportText += `• ${item.supplier_name || 'Non précisé'}\n`;
        exportText += `  ${dateStr} ${timeStr} | ${photoCount} photo${photoCount > 1 ? 's' : ''}\n`;
        if (item.note) exportText += `  Note: ${item.note}\n`;
        exportText += `\n`;
    });

    exportText += `━━━━━━━━━━━━━━━━━━━━\n`;
    exportText += `📊 Total: ${filtered.length} entrée(s)`;

    const emailRecipient = 'greensushi.mq@gmail.com';
    const subject = encodeURIComponent(`📋 Historique Traçabilité - ${periodLabel}`);
    const body = encodeURIComponent(exportText);
    const mailtoUrl = `mailto:${emailRecipient}?subject=${subject}&body=${body}`;

    window.location.href = mailtoUrl;
}

// ====================
// FONCTIONS GLOBALES (appelées depuis HTML onclick)
// ====================

window.openSupplierModal = openSupplierModal;
window.openUserModal = openUserModal;
window.deleteUser = deleteUser;
window.deleteFrozenFish = deleteFrozenFish;
window.deleteReception = deleteReception;
