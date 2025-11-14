// Application principale de gestion de stock Green Sushi

// État global de l'application
const AppState = {
    currentUser: null,
    currentCategory: null,
    currentPage: 'login-page',
    products: [],
    suppliers: [],
    lowStockProducts: [],
    editingProduct: null,
    editingSupplier: null,
    pinCode: ''
};

// ====================
// INITIALISATION
// ====================

document.addEventListener('DOMContentLoaded', async () => {
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

    // Initialiser Supabase
    const initialized = await db.init();

    if (!initialized) {
        alert('⚠️ Configuration Supabase manquante. Veuillez configurer SUPABASE_CONFIG dans config.js');
        showLoading(false);
        return;
    }

    // Charger les données
    await loadSuppliers();
    await loadProducts();
    await updateAlertCount();

    // Afficher la page d'accueil
    showPage('home-page');
    renderCategories();

    showLoading(false);
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
    const pinKeys = document.querySelectorAll('.pin-key');
    const loginError = document.getElementById('login-error');

    pinKeys.forEach(key => {
        key.addEventListener('click', async () => {
            const keyValue = key.dataset.key;

            if (keyValue === 'delete') {
                AppState.pinCode = '';
                updatePinDisplay();
                loginError.textContent = '';
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
                            loginError.textContent = '❌ Code PIN invalide';
                            AppState.pinCode = '';
                            updatePinDisplay();
                        }
                    }
                }
            }
        });
    });
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
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        db.logout();
        AppState.currentUser = null;
        AppState.pinCode = '';
        showPage('login-page');
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
    });

    // Fermeture des modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            closeModal(modalId);
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

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

    // Toggles paramètres
    document.getElementById('email-toggle').addEventListener('click', function() {
        this.classList.toggle('active');
        saveSettings();
    });

    document.getElementById('whatsapp-toggle').addEventListener('click', function() {
        this.classList.toggle('active');
        saveSettings();
    });

    // Inputs paramètres
    document.getElementById('email-input').addEventListener('change', saveSettings);
    document.getElementById('whatsapp-input').addEventListener('change', saveSettings);
}

// ====================
// CATÉGORIES
// ====================

function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    CATEGORIES.forEach(category => {
        // Compter les produits de cette catégorie
        const count = AppState.products.filter(p => p.category === category.id).length;

        const card = document.createElement('div');
        card.className = 'category-card';
        card.dataset.category = category.id;
        card.innerHTML = `
            <div class="category-icon">${category.icon}</div>
            <div class="category-name">${category.name}</div>
            <div class="category-count">${count} produit${count > 1 ? 's' : ''}</div>
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
        const isLowStock = product.quantity <= product.alert_threshold;
        const supplierName = product.supplier ? product.supplier.name : 'Sans fournisseur';

        const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-supplier">📦 ${supplierName}</div>
            </div>
            <div class="product-right">
                <div class="product-quantity">
                    <div class="product-qty-value ${isLowStock ? 'low-stock' : ''}">${product.quantity}</div>
                    <div class="product-unit">${product.unit}</div>
                </div>
            </div>
        `;

        item.addEventListener('click', () => {
            openProductModal(product);
        });

        container.appendChild(item);
    });
}

function filterProducts(searchTerm) {
    renderProducts(searchTerm);
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

    AppState.lowStockProducts.forEach(product => {
        const categoryName = CATEGORIES.find(c => c.id === product.category)?.name || product.category;
        const supplierName = product.supplier ? product.supplier.name : 'Sans fournisseur';

        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-header">
                <div class="list-item-title">${product.name}</div>
            </div>
            <div class="list-item-info">📂 ${categoryName}</div>
            <div class="list-item-info">📦 ${supplierName}</div>
            <div class="list-item-info" style="color: #e74c3c; font-weight: bold;">
                Stock: ${product.quantity} ${product.unit} (Seuil: ${product.alert_threshold})
            </div>
        `;

        container.appendChild(item);
    });
}

async function sendAlerts() {
    if (AppState.lowStockProducts.length === 0) {
        alert('ℹ️ Aucune alerte à envoyer');
        return;
    }

    // Récupérer les paramètres
    const settings = await db.getSettings();
    if (!settings.success) {
        alert('❌ Erreur de récupération des paramètres');
        return;
    }

    const emailEnabled = settings.data.email_notifications === 'true';
    const whatsappEnabled = settings.data.whatsapp_notifications === 'true';

    if (!emailEnabled && !whatsappEnabled) {
        alert('⚠️ Aucun moyen de notification activé. Veuillez configurer les paramètres.');
        return;
    }

    // Créer le message
    let message = '🚨 ALERTE STOCK BAS - Green Sushi\n\n';
    AppState.lowStockProducts.forEach(product => {
        const supplierName = product.supplier ? product.supplier.name : 'Sans fournisseur';
        message += `• ${product.name}\n`;
        message += `  Stock: ${product.quantity} ${product.unit} (Seuil: ${product.alert_threshold})\n`;
        message += `  Fournisseur: ${supplierName}\n\n`;
    });

    // Envoyer par email
    if (emailEnabled && settings.data.email_recipient) {
        const emailSent = await sendEmailAlert(settings.data.email_recipient, message);
        if (emailSent) {
            alert('✅ Alerte envoyée par email');
        }
    }

    // Envoyer par WhatsApp
    if (whatsappEnabled && settings.data.whatsapp_number) {
        sendWhatsAppAlert(settings.data.whatsapp_number, message);
    }
}

async function sendEmailAlert(email, message) {
    // Pour l'envoi d'email, on utiliserait Supabase Edge Functions
    // Ou un service tiers comme Resend, SendGrid, etc.
    // Pour l'instant, on affiche juste le message
    console.log('Email à envoyer à:', email);
    console.log('Message:', message);

    // TODO: Implémenter l'envoi réel d'email via Supabase Edge Function
    alert(`📧 Email préparé pour ${email}\n\n${message}\n\n⚠️ Fonctionnalité à configurer dans Supabase`);
    return true;
}

function sendWhatsAppAlert(number, message) {
    // Ouvrir WhatsApp avec le message pré-rempli
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${number.replace(/\+/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
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

    await db.updateSetting('email_notifications', emailEnabled.toString());
    await db.updateSetting('email_recipient', emailRecipient);
    await db.updateSetting('whatsapp_notifications', whatsappEnabled.toString());
    await db.updateSetting('whatsapp_number', whatsappNumber);
}

// ====================
// MODALES
// ====================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    AppState.editingProduct = null;
    AppState.editingSupplier = null;
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
