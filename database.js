// Gestionnaire de base de données avec Supabase
class DatabaseManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
    }

    // Initialiser la connexion Supabase
    async init() {
        if (typeof supabase === 'undefined') {
            console.error('Supabase client non chargé');
            return false;
        }

        try {
            this.supabase = supabase.createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.key
            );
            return true;
        } catch (error) {
            console.error('Erreur initialisation Supabase:', error);
            return false;
        }
    }

    // ===== AUTHENTIFICATION =====

    async authenticateWithPin(pin) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('pin_code', pin)
                .single();

            if (error) throw error;

            this.currentUser = data;
            localStorage.setItem('currentUser', JSON.stringify(data));
            return { success: true, user: data };
        } catch (error) {
            console.error('Erreur authentification:', error);
            return { success: false, error: 'Code PIN invalide' };
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    getCurrentUser() {
        if (this.currentUser) return this.currentUser;

        const stored = localStorage.getItem('currentUser');
        if (stored) {
            this.currentUser = JSON.parse(stored);
            return this.currentUser;
        }
        return null;
    }

    isPatron() {
        return this.currentUser && this.currentUser.role === 'patron';
    }

    // ===== GESTION DES UTILISATEURS =====

    async getUsers() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('name');

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur récupération utilisateurs:', error);
            return { success: false, error: error.message };
        }
    }

    async createUser(userData) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .insert([userData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur création utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    async updateUser(userId, userData) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .update(userData)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur modification utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteUser(userId) {
        try {
            const { error } = await this.supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== GESTION DES FOURNISSEURS =====

    async getSuppliers() {
        try {
            const { data, error } = await this.supabase
                .from('suppliers')
                .select('*')
                .order('name');

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur récupération fournisseurs:', error);
            return { success: false, error: error.message };
        }
    }

    async createSupplier(supplierData) {
        try {
            const { data, error } = await this.supabase
                .from('suppliers')
                .insert([supplierData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur création fournisseur:', error);
            return { success: false, error: error.message };
        }
    }

    async updateSupplier(supplierId, supplierData) {
        try {
            const { data, error } = await this.supabase
                .from('suppliers')
                .update(supplierData)
                .eq('id', supplierId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur modification fournisseur:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteSupplier(supplierId) {
        try {
            const { error } = await this.supabase
                .from('suppliers')
                .delete()
                .eq('id', supplierId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression fournisseur:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== GESTION DES PRODUITS =====

    async getProducts(category = null) {
        try {
            let query = this.supabase
                .from('products')
                .select(`
                    *,
                    supplier:suppliers(id, name, phone, email)
                `)
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur récupération produits:', error);
            return { success: false, error: error.message };
        }
    }

    async getProductById(productId) {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    supplier:suppliers(id, name, phone, email)
                `)
                .eq('id', productId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur récupération produit:', error);
            return { success: false, error: error.message };
        }
    }

    async createProduct(productData) {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .insert([productData])
                .select()
                .single();

            if (error) throw error;

            // Créer un mouvement de stock initial
            await this.createStockMovement({
                product_id: data.id,
                user_id: this.currentUser?.id,
                movement_type: 'entree',
                quantity_before: 0,
                quantity_after: productData.quantity,
                notes: 'Création du produit'
            });

            return { success: true, data };
        } catch (error) {
            console.error('Erreur création produit:', error);
            return { success: false, error: error.message };
        }
    }

    async updateProduct(productId, productData) {
        try {
            // Récupérer l'ancienne quantité
            const oldProduct = await this.getProductById(productId);

            const { data, error } = await this.supabase
                .from('products')
                .update(productData)
                .eq('id', productId)
                .select()
                .single();

            if (error) throw error;

            // Si la quantité a changé, créer un mouvement
            if (oldProduct.success && productData.quantity !== undefined &&
                productData.quantity !== oldProduct.data.quantity) {
                await this.createStockMovement({
                    product_id: productId,
                    user_id: this.currentUser?.id,
                    movement_type: 'ajustement',
                    quantity_before: oldProduct.data.quantity,
                    quantity_after: productData.quantity,
                    notes: 'Ajustement manuel'
                });
            }

            return { success: true, data };
        } catch (error) {
            console.error('Erreur modification produit:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteProduct(productId) {
        try {
            const { error } = await this.supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression produit:', error);
            return { success: false, error: error.message };
        }
    }

    async moveProductUp(productId) {
        try {
            // Récupérer le produit actuel
            const currentProduct = await this.getProductById(productId);
            if (!currentProduct.success) return currentProduct;

            const currentOrder = currentProduct.data.display_order;
            const currentCategory = currentProduct.data.category;

            // Trouver le produit juste au-dessus DANS LA MÊME CATÉGORIE
            const { data: prevProducts, error: prevError } = await this.supabase
                .from('products')
                .select('id, display_order')
                .eq('category', currentCategory)
                .lt('display_order', currentOrder)
                .order('display_order', { ascending: false })
                .limit(1);

            if (prevError) throw prevError;
            if (!prevProducts || prevProducts.length === 0) {
                return { success: false, error: 'Déjà en première position' };
            }

            const prevProduct = prevProducts[0];

            // Échanger les ordres
            await this.supabase
                .from('products')
                .update({ display_order: prevProduct.display_order })
                .eq('id', productId);

            await this.supabase
                .from('products')
                .update({ display_order: currentOrder })
                .eq('id', prevProduct.id);

            return { success: true };
        } catch (error) {
            console.error('Erreur déplacement produit vers le haut:', error);
            return { success: false, error: error.message };
        }
    }

    async moveProductDown(productId) {
        try {
            // Récupérer le produit actuel
            const currentProduct = await this.getProductById(productId);
            if (!currentProduct.success) return currentProduct;

            const currentOrder = currentProduct.data.display_order;
            const currentCategory = currentProduct.data.category;

            // Trouver le produit juste en dessous DANS LA MÊME CATÉGORIE
            const { data: nextProducts, error: nextError } = await this.supabase
                .from('products')
                .select('id, display_order')
                .eq('category', currentCategory)
                .gt('display_order', currentOrder)
                .order('display_order', { ascending: true })
                .limit(1);

            if (nextError) throw nextError;
            if (!nextProducts || nextProducts.length === 0) {
                return { success: false, error: 'Déjà en dernière position' };
            }

            const nextProduct = nextProducts[0];

            // Échanger les ordres
            await this.supabase
                .from('products')
                .update({ display_order: nextProduct.display_order })
                .eq('id', productId);

            await this.supabase
                .from('products')
                .update({ display_order: currentOrder })
                .eq('id', nextProduct.id);

            return { success: true };
        } catch (error) {
            console.error('Erreur déplacement produit vers le bas:', error);
            return { success: false, error: error.message };
        }
    }

    async getLowStockProducts() {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    supplier:suppliers(id, name, phone, email)
                `)
                .order('quantity');

            if (error) throw error;

            // Filtrer les produits avec stock bas
            const lowStock = data.filter(p => p.quantity <= p.alert_threshold);
            return { success: true, data: lowStock };
        } catch (error) {
            console.error('Erreur récupération produits en stock bas:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== MOUVEMENTS DE STOCK =====

    async createStockMovement(movementData) {
        try {
            const { data, error } = await this.supabase
                .from('stock_movements')
                .insert([movementData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur création mouvement:', error);
            return { success: false, error: error.message };
        }
    }

    async getStockMovements(productId = null, limit = 50) {
        try {
            let query = this.supabase
                .from('stock_movements')
                .select(`
                    *,
                    product:products(name),
                    user:users(name, role)
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (productId) {
                query = query.eq('product_id', productId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur récupération mouvements:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== PARAMÈTRES =====

    async getSettings() {
        try {
            const { data, error } = await this.supabase
                .from('app_settings')
                .select('*');

            if (error) throw error;

            // Convertir en objet clé-valeur
            const settings = {};
            data.forEach(item => {
                settings[item.setting_key] = item.setting_value;
            });

            return { success: true, data: settings };
        } catch (error) {
            console.error('Erreur récupération paramètres:', error);
            return { success: false, error: error.message };
        }
    }

    async updateSetting(key, value) {
        try {
            const { data, error } = await this.supabase
                .from('app_settings')
                .upsert({
                    setting_key: key,
                    setting_value: value
                }, {
                    onConflict: 'setting_key'
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur mise à jour paramètre:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== ALERTES =====

    async recordSentAlert(productId, alertType) {
        try {
            const { data, error } = await this.supabase
                .from('sent_alerts')
                .insert([{
                    product_id: productId,
                    alert_type: alertType
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur enregistrement alerte:', error);
            return { success: false, error: error.message };
        }
    }

    async checkIfAlertSent(productId, alertType, hours = 24) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - hours);

            const { data, error } = await this.supabase
                .from('sent_alerts')
                .select('*')
                .eq('product_id', productId)
                .eq('alert_type', alertType)
                .gte('sent_at', cutoffDate.toISOString())
                .order('sent_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            return { success: true, sent: data.length > 0 };
        } catch (error) {
            console.error('Erreur vérification alerte:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== HISTORIQUE DES MESSAGES =====

    async createMessageHistory(messageData) {
        try {
            const { data, error } = await this.supabase
                .from('message_history')
                .insert([{
                    user_id: this.currentUser?.id,
                    send_method: messageData.send_method,
                    recipient: messageData.recipient,
                    message_content: messageData.message_content,
                    product_count: messageData.product_count
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur enregistrement message:', error);
            return { success: false, error: error.message };
        }
    }

    async getMessageHistory(limit = 50) {
        try {
            const { data, error } = await this.supabase
                .from('message_history')
                .select(`
                    *,
                    user:users(name, role)
                `)
                .order('sent_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur récupération historique messages:', error);
            return { success: false, error: error.message };
        }
    }

    async getMessageById(messageId) {
        try {
            const { data, error } = await this.supabase
                .from('message_history')
                .select(`
                    *,
                    user:users(name, role)
                `)
                .eq('id', messageId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur récupération message:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== GESTION DES TYPES DE SUSHIS =====

    async getSushiTypes() {
        try {
            const { data, error } = await this.supabase
                .from('sushi_types')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur récupération types de sushis:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== GESTION DES CONGÉLATIONS =====

    async getFrozenSushi(filters = {}) {
        try {
            let query = this.supabase
                .from('frozen_sushi')
                .select(`
                    id,
                    fish_type,
                    quantity,
                    frozen_at,
                    expiry_date,
                    sushi_type:sushi_types(id, name, category),
                    user:users!frozen_sushi_user_id_fkey(id, name)
                `)
                .order('frozen_at', { ascending: false });

            // Appliquer les filtres si fournis
            if (filters.month && filters.year) {
                // Filtrer par mois et année
                const startDate = `${filters.year}-${filters.month.padStart(2, '0')}-01`;
                const endMonth = parseInt(filters.month) === 12 ? 1 : parseInt(filters.month) + 1;
                const endYear = parseInt(filters.month) === 12 ? parseInt(filters.year) + 1 : filters.year;
                const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

                query = query
                    .gte('frozen_at', startDate)
                    .lt('frozen_at', endDate);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur récupération sushis congelés:', error);
            return { success: false, error: error.message };
        }
    }

    async createFrozenSushi(data) {
        try {
            const insertData = {
                sushi_type_id: data.sushi_type_id,
                fish_type: data.fish_type || null,
                quantity: data.quantity,
                user_id: data.user_id
            };

            // Ajouter frozen_at si fourni, sinon NOW() sera utilisé par défaut
            if (data.frozen_at) {
                insertData.frozen_at = data.frozen_at;
            }

            const { data: result, error } = await this.supabase
                .from('frozen_sushi')
                .insert([insertData])
                .select(`
                    id,
                    fish_type,
                    quantity,
                    frozen_at,
                    expiry_date,
                    sushi_type:sushi_types(id, name, category),
                    user:users!frozen_sushi_user_id_fkey(id, name)
                `)
                .single();

            if (error) throw error;
            return { success: true, data: result };
        } catch (error) {
            console.error('Erreur création sushi congelé:', error);
            return { success: false, error: error.message };
        }
    }

    async updateFrozenSushi(id, data) {
        try {
            const updateData = {
                sushi_type_id: data.sushi_type_id,
                fish_type: data.fish_type || null,
                quantity: data.quantity,
                frozen_at: data.frozen_at,
                updated_at: new Date().toISOString(),
                updated_by: this.currentUser?.id
            };

            const { data: result, error } = await this.supabase
                .from('frozen_sushi')
                .update(updateData)
                .eq('id', id)
                .select(`
                    id,
                    sushi_type_id,
                    fish_type,
                    quantity,
                    frozen_at,
                    expiry_date,
                    sushi_type:sushi_types(id, name, category, requires_fish_selection, available_fish),
                    user:users!frozen_sushi_user_id_fkey(id, name)
                `)
                .single();

            if (error) throw error;
            return { success: true, data: result };
        } catch (error) {
            console.error('Erreur mise à jour sushi congelé:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteFrozenSushi(id) {
        try {
            const { error } = await this.supabase
                .from('frozen_sushi')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression sushi congelé:', error);
            return { success: false, error: error.message };
        }
    }

    async getFrozenSushiForExport(month, year) {
        try {
            // Utiliser la même logique que getFrozenSushi mais avec filtres obligatoires
            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const endMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
            const endYear = parseInt(month) === 12 ? parseInt(year) + 1 : year;
            const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

            const { data, error } = await this.supabase
                .from('frozen_sushi')
                .select(`
                    id,
                    fish_type,
                    quantity,
                    frozen_at,
                    expiry_date,
                    sushi_type:sushi_types(id, name, category),
                    user:users!frozen_sushi_user_id_fkey(id, name)
                `)
                .gte('frozen_at', startDate)
                .lt('frozen_at', endDate)
                .order('frozen_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur récupération sushis congelés pour export:', error);
            return { success: false, error: error.message };
        }
    }
}

// Instance globale
const db = new DatabaseManager();
