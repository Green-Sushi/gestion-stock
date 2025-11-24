// Application principale de gestion de stock Green Sushi

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
    pendingSendConfirmation: false
};

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
        return;
    }

    // Vérifier si déjà connecté
    const storedUser = localStorage.getItem('currentUser');

    if (storedUser) {
        try {
            AppState.currentUser = JSON.parse(storedUser);
            await initializeApp();
        } catch (e) {
            // Session invalide, afficher login
            showPage('login-page');
            setupLoginPage();
        }
    } else {
        setupLoginPage();
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
        'add-product-btn',          // Bouton ajouter produit
        'add-supplier-btn',         // Bouton ajouter fournisseur
        'manage-users-btn'          // Bouton gérer utilisateurs
        // 'send-alerts-btn' supprimé - accessible à tous
    ];

    // Onglets réservés au patron
    const patronOnlyTabs = [
        'suppliers-page',   // Page fournisseurs
        'settings-page'     // Page paramètres
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
    const roleIcon = document.getElementById('role-icon');
    if (!roleIcon) return;

    const isPatron = db.isPatron();
    roleIcon.textContent = isPatron ? '🔑' : '👤';
    roleIcon.title = isPatron ? 'Patron' : 'Salarié';
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
    // Ouvrir la modale de confirmation
    const modal = document.getElementById('logout-modal');
    modal.classList.add('active');
}

function confirmLogout() {
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
    });

    // Fermeture des modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            closeModal(modalId);
        });
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', logout);
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
}

// ====================
// CATÉGORIES
// ====================

function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    // Mapping des catégories vers les noms de fichiers images
    const categoryImages = {
        'frais': 'frais.png',
        'sec': 'sec.png',
        'surgele': 'surgelé.png',
        'consommables': 'consommables.png',
        'boissons': 'boissons.png',
        'autre': 'autres.png'
    };

    CATEGORIES.forEach(category => {
        // Compter les produits de cette catégorie
        const categoryProducts = AppState.products.filter(p => p.category === category.id);
        const count = categoryProducts.length;

        // Compter les produits en alerte
        const alertCount = categoryProducts.filter(p => p.quantity <= p.alert_threshold).length;

        const card = document.createElement('div');
        card.className = 'category-card';
        card.dataset.category = category.id;
        card.innerHTML = `
            <img src="./images/categories/${categoryImages[category.id]}" alt="${category.name}" class="category-image">
            <div class="category-badges">
                <div class="category-badge total" title="${count} produit${count > 1 ? 's' : ''}">${count}</div>
                ${alertCount > 0 ? `<div class="category-badge alerts" title="${alertCount} en alerte">${alertCount}</div>` : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            AppState.currentCategory = category.id;
            showCategoryProducts(category);
        });

        container.appendChild(card);
    });
}

function showCategoryProducts(category) {
    document.getElementById('category-title').textContent = category.name;
    showPage('products-page');
    renderProducts();
}

// ====================
// PRODUITS
// ====================

// Calculer le niveau de stock (système 4 niveaux)
function calculateStockLevel(quantity, alertThreshold, optimalStock) {
    let stockLevel = 'stock-ok';
    let isLowStock = false;

    if (quantity <= alertThreshold) {
        // ROUGE: stock critique (≤ seuil d'alerte)
        stockLevel = 'stock-critical';
        isLowStock = true;
    } else if (quantity <= alertThreshold * 2) {
        // ORANGE: stock en limite (≤ seuil × 2)
        stockLevel = 'stock-warning';
    } else if (optimalStock && quantity <= optimalStock * 0.5) {
        // JAUNE: stock attention (≤ optimal × 0.5)
        stockLevel = 'stock-attention';
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

    // Trier par stock bas en premier
    products.sort((a, b) => {
        const aLow = a.quantity <= a.alert_threshold;
        const bLow = b.quantity <= b.alert_threshold;
        if (aLow && !bLow) return -1;
        if (!aLow && bLow) return 1;
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
        // Déterminer le niveau de stock avec le système 4 niveaux
        const { stockLevel, isLowStock } = calculateStockLevel(
            product.quantity,
            product.alert_threshold,
            product.optimal_stock
        );

        const supplierName = product.supplier ? product.supplier.name : 'Sans fournisseur';

        const item = document.createElement('div');
        item.className = isLowStock ? 'product-item low-stock-alert' : 'product-item';

        // Boutons d'action visibles uniquement pour le Patron
        const actionButtons = db.isPatron() ?
            `<div class="product-actions">
                <button class="btn-edit-product" data-product-id="${product.id}" title="Modifier ce produit">✏️</button>
                <button class="btn-delete-product" data-product-id="${product.id}" title="Supprimer ce produit">🗑️</button>
            </div>` : '';

        item.innerHTML = `
            ${actionButtons}
            <div class="product-info" data-product-id="${product.id}">
                <div class="product-name">${product.name}</div>
                <div class="product-supplier">${supplierName}</div>
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

        // Boutons d'action (Patron uniquement)
        if (db.isPatron()) {
            const btnEdit = item.querySelector('.btn-edit-product');
            if (btnEdit) {
                btnEdit.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openProductModal(product);
                });
            }

            const btnDelete = item.querySelector('.btn-delete-product');
            if (btnDelete) {
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteProduct(product.id, product.name);
                });
            }
        }

        container.appendChild(item);
    });
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

        // Déterminer le nouveau niveau de stock avec le système 4 niveaux
        const { stockLevel, isLowStock } = calculateStockLevel(
            newQuantity,
            product.alert_threshold,
            product.optimal_stock
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
        // Si l'update échoue, revenir à l'ancienne valeur
        product.quantity = oldQuantity;
        if (qtyElement) {
            qtyElement.textContent = oldQuantity;
        }
        alert('❌ Erreur lors de la mise à jour : ' + result.error);
    } else {
        // Mettre à jour le compteur d'alertes
        await updateAlertCount();
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
        // Recharger les produits et mettre à jour l'affichage
        await loadProducts();
        renderProducts();
        await updateAlertCount();
        renderCategories();
    } else {
        alert('❌ Erreur lors de la suppression : ' + result.error);
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
        name: document.getElementById('product-name').value,
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
        closeModal('product-modal');
        await loadProducts();
        renderProducts();
        await updateAlertCount();
        renderCategories();
    } else {
        alert('❌ Erreur: ' + result.error);
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

async function loadUsers() {
    const result = await db.getUsers();
    if (result.success) {
        AppState.users = result.data;
    }
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
        closeModal('supplier-modal');
        await loadSuppliers();
        renderSuppliers();
    } else {
        alert('❌ Erreur: ' + result.error);
    }
}

// ====================
// ALERTES
// ====================

async function updateAlertCount() {
    const result = await db.getLowStockProducts();
    if (result.success) {
        AppState.lowStockProducts = result.data;
        document.getElementById('alert-count').textContent = result.data.length;
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
        'autre': '#95a5a6'
    };

    // Trier par catégorie puis alphabétique
    const sortedProducts = [...AppState.lowStockProducts].sort((a, b) => {
        // D'abord par catégorie
        const categoryOrder = ['frais', 'sec', 'surgele', 'consommables', 'boissons', 'autre'];
        const catIndexA = categoryOrder.indexOf(a.category);
        const catIndexB = categoryOrder.indexOf(b.category);
        if (catIndexA !== catIndexB) {
            return catIndexA - catIndexB;
        }
        // Puis alphabétique
        return a.name.localeCompare(b.name);
    });

    sortedProducts.forEach(product => {
        const categoryName = CATEGORIES.find(c => c.id === product.category)?.name || product.category;
        const borderColor = categoryColors[product.category] || '#999';

        // Déterminer le niveau de stock avec le système 4 couleurs
        const { stockLevel } = calculateStockLevel(
            product.quantity,
            product.alert_threshold,
            product.optimal_stock
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
}

// Générer le message récapitulatif formaté
function generateAlertMessage() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Indicateurs par niveau de stock (paires de substitution UTF-16)
    const levelIndicators = {
        'stock-critical': '\uD83D\uDD34', // 🔴
        'stock-warning': '\uD83D\uDFE0',  // 🟠
        'stock-attention': '\uD83D\uDFE1', // 🟡
        'stock-ok': '\uD83D\uDFE2'        // 🟢
    };

    // Emoji par catégorie (paires de substitution UTF-16)
    const categoryEmojis = {
        'frais': '\uD83E\uDDC0',      // 🧀
        'sec': '\uD83C\uDF3E',         // 🌾
        'surgele': '\u2744\uFE0F',     // ❄️
        'consommables': '\uD83E\uDD62', // 🥢
        'boissons': '\uD83E\uDDC3',    // 🧃
        'autre': '\uD83D\uDCE6'        // 📦
    };

    let message = '\uD83D\uDEA8 ALERTE STOCK - Green Sushi\n'; // 🚨
    message += '\uD83D\uDCC5 ' + dateStr + ' \u00E0 ' + timeStr + '\n'; // 📅 à
    message += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n';

    // Regrouper par catégorie
    const byCategory = {};
    AppState.lowStockProducts.forEach(product => {
        if (!byCategory[product.category]) {
            byCategory[product.category] = [];
        }
        byCategory[product.category].push(product);
    });

    // Ordre des catégories
    const categoryOrder = ['frais', 'sec', 'surgele', 'consommables', 'boissons', 'autre'];

    categoryOrder.forEach(catId => {
        if (!byCategory[catId] || byCategory[catId].length === 0) return;

        const category = CATEGORIES.find(c => c.id === catId);
        const catLabel = categoryEmojis[catId] || '[AUTRE]';

        message += catLabel + ' ' + category.name.toUpperCase() + '\n';
        message += '\u2500'.repeat(30) + '\n';

        byCategory[catId].forEach(product => {
            const { stockLevel } = calculateStockLevel(
                product.quantity,
                product.alert_threshold,
                product.optimal_stock
            );
            const levelIndicator = levelIndicators[stockLevel] || '[OK]';

            message += levelIndicator + ' ' + product.name + '\n';
            message += '   Stock: ' + product.quantity + ' ' + product.unit + '\n\n';
        });
        message += '\n';
    });

    // Total
    message += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n';
    message += '\uD83D\uDCCA TOTAL: ' + AppState.lowStockProducts.length + ' produit' + (AppState.lowStockProducts.length > 1 ? 's' : '') + ' en alerte'; // 📊

    return message;
}

async function sendAlerts() {
    if (AppState.lowStockProducts.length === 0) {
        alert('ℹ️ Aucune alerte à envoyer');
        return;
    }

    // DEBUG: Afficher le message généré dans la console
    const testMessage = generateAlertMessage();
    console.log('=== MESSAGE GÉNÉRÉ ===');
    console.log(testMessage);
    console.log('=== FIN MESSAGE ===');

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

    // Générer le message formaté
    const message = generateAlertMessage();

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

    // Générer le message formaté
    const message = generateAlertMessage();

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

    // Utiliser api.whatsapp.com au lieu de wa.me pour meilleur support des emojis
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanNumber.replace(/\+/g, '')}&text=${encodedMessage}`;

    // Ouvrir WhatsApp dans un nouvel onglet pour ne pas quitter l'application
    window.open(whatsappUrl, '_blank');
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
    await db.updateSetting('email_notifications', emailEnabled.toString());
    await db.updateSetting('email_recipient', emailRecipient);
    await db.updateSetting('whatsapp_notifications', whatsappEnabled.toString());
    await db.updateSetting('whatsapp_number', whatsappNumber);
    showLoading(false);

    alert('✅ Paramètres sauvegardés !');
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
                        <div style="color: #666; font-size: 0.9rem;">${message.user ? message.user.name : 'Utilisateur inconnu'}</div>
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
        <div style="margin-bottom: 8px;"><strong>Envoyé par :</strong> ${message.user ? message.user.name : 'Utilisateur inconnu'}</div>
        <div style="margin-bottom: 8px;"><strong>Méthode :</strong> ${methodLabel}</div>
        <div style="margin-bottom: 8px;"><strong>Destinataire :</strong> ${message.recipient}</div>
        <div><strong>Produits en alerte :</strong> ${message.product_count}</div>
    `;
}

// ====================
// GESTION DES UTILISATEURS
// ====================

async function openUsersManagement() {
    // Vérifier que l'utilisateur est patron
    if (!db.isPatron()) {
        alert('⛔ Accès réservé au patron');
        return;
    }

    const modal = document.getElementById('users-management-modal');
    modal.classList.add('active');

    await renderUsersList();
}

async function renderUsersList() {
    const container = document.getElementById('users-list');
    container.innerHTML = '';

    const result = await db.getUsers();
    if (!result.success) {
        container.innerHTML = '<div class="empty-state-text">Erreur de chargement</div>';
        return;
    }

    const users = result.data;

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
                    <div class="list-item-info">${roleText} • PIN: ${user.pin_code}</div>
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
        document.getElementById('user-pin').value = user.pin_code;
        document.getElementById('user-role').value = user.role;
    } else {
        // Mode création
        title.textContent = 'Nouvel utilisateur';
    }

    modal.classList.add('active');
}

async function handleUserSubmit(e) {
    e.preventDefault();

    const userData = {
        name: document.getElementById('user-name').value,
        pin_code: document.getElementById('user-pin').value,
        role: document.getElementById('user-role').value
    };

    // Validation
    if (!/^\d{6}$/.test(userData.pin_code)) {
        alert('❌ Le code PIN doit contenir exactement 6 chiffres');
        return;
    }

    showLoading(true);

    let result;
    if (AppState.editingUser) {
        // Mise à jour
        result = await db.updateUser(AppState.editingUser.id, userData);
    } else {
        // Création
        result = await db.createUser(userData);
    }

    showLoading(false);

    if (result.success) {
        closeModal('user-modal');
        await renderUsersList();
    } else {
        alert('❌ Erreur: ' + result.error);
    }
}

async function deleteUser(userId) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
        return;
    }

    showLoading(true);
    const result = await db.deleteUser(userId);
    showLoading(false);

    if (result.success) {
        await renderUsersList();
    } else {
        alert('❌ Erreur: ' + result.error);
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
// FONCTIONS GLOBALES (appelées depuis HTML onclick)
// ====================

window.openSupplierModal = openSupplierModal;
window.openUserModal = openUserModal;
window.deleteUser = deleteUser;
