// Gestionnaire de base de données avec Supabase
class DatabaseManager {
    // Duree d'une session : 12 heures. Couvre une journee de travail sans
    // gener, et un telephone oublie ne reste pas ouvert indefiniment.
    static SESSION_DUREE_MS = 12 * 60 * 60 * 1000;

    // Plafond de fiches de traçabilité lues d'un coup. Au-delà, l'écran
    // invite à filtrer par mois — il ne cache jamais sans le dire.
    static LIMITE_RECEPTIONS = 200;

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

    // La table `users` n'est plus accessible depuis le navigateur : la
    // verification passe par une fonction de la base, qui compare le code a
    // son empreinte et ne renvoie JAMAIS le code lui-meme.
    async authenticateWithPin(pin) {
        try {
            const { data, error } = await this.supabase.rpc('verify_pin', { p_pin: pin });

            // Ne JAMAIS annoncer « code invalide » quand c'est la base qui est
            // injoignable : l'utilisateur en conclurait qu'il a perdu son code.
            if (error) {
                console.error('Erreur authentification:', error);
                return { success: false, error: 'Connexion impossible. Vérifiez le réseau et réessayez.' };
            }
            if (!data || data.length === 0) {
                return { success: false, error: 'Code PIN invalide' };
            }

            const row = data[0];
            // On ne conserve QUE de quoi identifier la session. Jamais le code.
            const session = {
                id: row.user_id,
                name: row.user_name,
                role: row.user_role,
                expiresAt: Date.now() + DatabaseManager.SESSION_DUREE_MS
            };

            this.currentUser = session;
            localStorage.setItem('currentUser', JSON.stringify(session));
            return { success: true, user: session };
        } catch (error) {
            console.error('Erreur authentification:', error);
            return { success: false, error: 'Connexion impossible. Vérifiez le réseau et réessayez.' };
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    getCurrentUser() {
        if (this.currentUser) {
            if (this.estSessionExpiree(this.currentUser)) { this.logout(); return null; }
            return this.currentUser;
        }

        const stored = localStorage.getItem('currentUser');
        if (!stored) return null;

        let session;
        try { session = JSON.parse(stored); } catch { this.logout(); return null; }

        // Une session d'avant ce changement n'a pas d'echeance : on la rejette
        // plutot que de la laisser vivre indefiniment.
        if (this.estSessionExpiree(session)) { this.logout(); return null; }

        this.currentUser = session;
        return this.currentUser;
    }

    estSessionExpiree(session) {
        return !session || !session.expiresAt || Date.now() > session.expiresAt;
    }

    isPatron() {
        return this.currentUser && this.currentUser.role === 'patron';
    }

    // ===== GESTION DES UTILISATEURS =====

    // Les quatre fonctions ci-dessous exigent un code patron valide, verifie
    // PAR LA BASE. L'interface ne peut plus s'en dispenser : la table est
    // fermee, il n'existe aucun autre chemin.

    async getUsers(adminPin) {
        try {
            const { data, error } = await this.supabase.rpc('admin_list_users', { p_admin_pin: adminPin });
            if (error) throw error;
            // On remet des noms de champs conformes au reste de l'application.
            const users = (data || []).map(r => ({ id: r.user_id, name: r.user_name, role: r.user_role }));
            return { success: true, data: users };
        } catch (error) {
            console.error('Erreur récupération utilisateurs:', error);
            return { success: false, error: error.message };
        }
    }

    async saveUser(adminPin, { id = null, name, role, pin = null }) {
        try {
            const { data, error } = await this.supabase.rpc('admin_save_user', {
                p_admin_pin: adminPin, p_id: id, p_name: name, p_role: role, p_pin: pin
            });
            if (error) throw error;
            return { success: true, data: { id: data } };
        } catch (error) {
            console.error('Erreur enregistrement utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteUser(adminPin, userId) {
        try {
            const { error } = await this.supabase.rpc('admin_delete_user', {
                p_admin_pin: adminPin, p_id: userId
            });
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
            const avecAuteur = {
                ...supplierData,
                created_by: this.currentUser?.id || null,
                created_by_name: this.currentUser?.name || null
            };
            const { data, error } = await this.supabase
                .from('suppliers')
                .insert([avecAuteur])
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
            // L'auteur de la création est désormais enregistré : sans lui,
            // « on sait qui fait quoi » aurait été faux pour les créations.
            // On inscrit AUSSI le nom, pas seulement l'identifiant : sans lui,
            // l'application devrait pouvoir lire les noms de tous les comptes
            // pour les afficher — donc les exposer à quiconque a la clé.
            const avecAuteur = {
                ...productData,
                created_by: this.currentUser?.id || null,
                created_by_name: this.currentUser?.name || null
            };
            const { data, error } = await this.supabase
                .from('products')
                .insert([avecAuteur])
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

    // Depuis le lot 2 (interface allégée), plus aucun bouton n'appelle cette
    // fonction : les flèches ↑/↓ ont été retirées de la ligne produit. La
    // fonction et display_order restent en place, volontairement.
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

    // Depuis le lot 2 (interface allégée), plus aucun bouton n'appelle cette
    // fonction : les flèches ↑/↓ ont été retirées de la ligne produit. La
    // fonction et display_order restent en place, volontairement.
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

            // Ruptures ET limites. Les limites servent à anticiper : les
            // exclure d'ici les rendait invisibles sur l'écran Alertes, alors
            // que ce sont elles qui permettent de commander AVANT de manquer.
            // Le compteur de l'onglet, lui, ne compte que les ruptures.
            const lowStock = data.filter(p => p.quantity <= p.alert_threshold * 2);
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
                .insert([{ ...movementData, user_name: this.currentUser?.name || null }])
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
                    user_name
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
                    user_name: this.currentUser?.name || null,
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
                    user_name
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
                    user_name
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
                    user_name
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

    // Le nom de l'auteur est inscrit SUR la ligne. La table `users` étant
    // fermée, une jointure vers elle ferait échouer toute la requête —
    // c'est ce qui avait cassé quatre écrans.
    async createFrozenSushi(data) {
        try {
            const insertData = {
                sushi_type_id: data.sushi_type_id,
                fish_type: data.fish_type || null,
                user_name: this.currentUser?.name || null,
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
                    user_name
                `)
                .single();

            if (error) throw error;
            return { success: true, data: result };
        } catch (error) {
            console.error('Erreur création sushi congelé:', error);
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
                    user_name
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

    // ===== GESTION DE LA SURGÉLATION DU POISSON =====

    async getFrozenFish(filters = {}) {
        try {
            let query = this.supabase
                .from('frozen_fish')
                .select(`
                    id,
                    fish_type,
                    quantity,
                    unit,
                    frozen_at,
                    expiry_date,
                    note,
                    user_name
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
            console.error('Erreur récupération surgélations poisson:', error);
            return { success: false, error: error.message };
        }
    }

    // expiry_date n'est PAS calculée par la base pour cette table : c'est
    // à l'appelant de la fournir (frozen_at + 6 mois). Le nom de l'auteur
    // est inscrit SUR la ligne. La table `users` étant fermée, une jointure
    // vers elle ferait échouer toute la requête — c'est ce qui avait cassé
    // quatre écrans.
    async createFrozenFish(data) {
        try {
            const insertData = {
                fish_type: data.fish_type,
                quantity: data.quantity,
                unit: data.unit,
                note: data.note || null,
                expiry_date: data.expiry_date,
                user_name: this.currentUser?.name || null,
                user_id: data.user_id
            };

            // Ajouter frozen_at si fourni, sinon NOW() sera utilisé par défaut
            if (data.frozen_at) {
                insertData.frozen_at = data.frozen_at;
            }

            const { data: result, error } = await this.supabase
                .from('frozen_fish')
                .insert([insertData])
                .select(`
                    id,
                    fish_type,
                    quantity,
                    unit,
                    frozen_at,
                    expiry_date,
                    note,
                    user_name
                `)
                .single();

            if (error) throw error;
            return { success: true, data: result };
        } catch (error) {
            console.error('Erreur création surgélation poisson:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteFrozenFish(id) {
        try {
            const { error } = await this.supabase
                .from('frozen_fish')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression surgélation poisson:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== GESTION DE LA TRAÇABILITÉ (RÉCEPTIONS) =====

    // Chaque réception embarque ses photos via la jointure `reception_photos`.
    // JAMAIS de jointure vers `users` : la table est fermée, le nom est déjà
    // inscrit sur la ligne au moment de la création.
    async getReceptions(filters = {}) {
        try {
            let query = this.supabase
                .from('receptions')
                .select(`
                    id,
                    received_at,
                    product_id,
                    product_name,
                    supplier_id,
                    supplier_name,
                    note,
                    user_name,
                    photos:reception_photos(id, storage_path, taille_octets)
                `)
                .order('received_at', { ascending: false })
                // Garde-fou : un registre sanitaire ne cesse jamais de
                // grossir. Sans plafond, ouvrir la page téléchargerait un
                // jour des années de fiches d'un coup, sur le réseau du
                // comptoir. On en demande une de plus que la limite affichée
                // pour savoir s'il y en avait davantage, et le dire.
                .limit(DatabaseManager.LIMITE_RECEPTIONS + 1);

            // Filtres mois/année appliqués ICI plutôt qu'après coup dans le
            // navigateur : filtrer sur un mois doit ALLÉGER la requête, pas
            // seulement l'affichage.
            //
            // Les bornes sont construites en heure LOCALE puis converties,
            // JAMAIS écrites en texte nu ('2026-03-01'). Le serveur est en
            // temps universel et la Martinique a quatre heures de retard :
            // une borne nue demanderait, en heure d'ici, du 28 février 20 h
            // au 31 mars 20 h. Une fiche saisie le 31 mars à 20 h 30 — fin
            // de service, on range et on photographie les étiquettes —
            // sortait alors du mois de mars côté serveur tout en y restant
            // côté navigateur : invisible dans les deux mois. Vérifié.
            if (filters.year) {
                const annee = parseInt(filters.year);
                const mois = filters.month ? parseInt(filters.month) : null;

                const debut = mois ? new Date(annee, mois - 1, 1) : new Date(annee, 0, 1);
                const fin = mois ? new Date(annee, mois, 1) : new Date(annee + 1, 0, 1);

                query = query
                    .gte('received_at', debut.toISOString())
                    .lt('received_at', fin.toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;

            // On avait demandé une fiche de plus que la limite : si elle est
            // là, c'est qu'il y en a d'autres. On la retire et on le signale,
            // pour que l'écran puisse le DIRE au lieu de masquer en silence.
            const tronque = (data || []).length > DatabaseManager.LIMITE_RECEPTIONS;
            return {
                success: true,
                data: tronque ? data.slice(0, DatabaseManager.LIMITE_RECEPTIONS) : data,
                tronque
            };
        } catch (error) {
            console.error('Erreur récupération réceptions:', error);
            return { success: false, error: error.message };
        }
    }

    // supplier_name est recopié tel que fourni par l'appelant (déjà résolu
    // depuis AppState.suppliers, chargée au démarrage) : un fournisseur
    // renommé ou supprimé plus tard ne doit pas réécrire l'histoire de cette
    // réception. user_name est, lui, rempli ICI depuis la session en cours.
    async createReception(data) {
        try {
            const insertData = {
                product_id: data.product_id || null,
                product_name: data.product_name || null,
                supplier_id: data.supplier_id || null,
                supplier_name: data.supplier_name || null,
                note: data.note || null,
                user_name: this.currentUser?.name || null,
                user_id: data.user_id
            };

            if (data.received_at) {
                insertData.received_at = data.received_at;
            }

            const champs = `
                    id,
                    received_at,
                    product_id,
                    product_name,
                    supplier_id,
                    supplier_name,
                    note,
                    user_name
                `;

            let { data: result, error } = await this.supabase
                .from('receptions')
                .insert([insertData])
                .select(champs)
                .single();

            // 23503 = l'une des trois références de la ligne ne pointe plus
            // sur rien : produit, fournisseur ou compte supprimé depuis un
            // autre téléphone pendant la saisie. Le code ne dit pas laquelle,
            // et les trois listes chargées à l'ouverture de l'application
            // sont périmées de la même façon — on les retire donc toutes.
            //
            // La fiche n'est PAS perdue pour autant : product_name,
            // supplier_name et user_name sont déjà recopiés sur la ligne, et
            // ce sont eux qui font foi. Mieux vaut une fiche sans lien qu'une
            // erreur technique brute et des photos perdues.
            if (error && error.code === '23503') {
                console.warn('Référence absente, réception enregistrée sans lien:', insertData.product_name, error.details);
                insertData.product_id = null;
                insertData.supplier_id = null;
                insertData.user_id = null;
                ({ data: result, error } = await this.supabase
                    .from('receptions')
                    .insert([insertData])
                    .select(champs)
                    .single());
            }

            if (error) throw error;
            return { success: true, data: result };
        } catch (error) {
            console.error('Erreur création réception:', error);
            return { success: false, error: error.message };
        }
    }

    // Les fichiers de l'espace de stockage ne suivent PAS la suppression en
    // cascade de la base : seules les lignes `reception_photos` disparaissent
    // avec la réception, jamais les fichiers eux-mêmes. On les efface donc
    // ICI, juste APRÈS la ligne — sinon ils resteraient orphelins et
    // occuperaient l'espace pour toujours.
    async deleteReception(id) {
        try {
            // On relève les chemins AVANT de supprimer la ligne : la cascade
            // effacera reception_photos, et on ne saurait plus quels fichiers
            // sont à nettoyer. Un échec de lecture ne bloque pas la
            // suppression — il ne coûte que des fichiers orphelins.
            const { data: photos, error: photosError } = await this.supabase
                .from('reception_photos')
                .select('storage_path')
                .eq('reception_id', id);

            if (photosError) console.error('Erreur lecture photos avant suppression:', photosError);

            // La LIGNE d'abord, les FICHIERS ensuite. L'ordre inverse laisse,
            // si la connexion tombe entre les deux, une réception qui annonce
            // « 3 photos » dont les fichiers n'existent plus, sans le moindre
            // message : sur un registre qui sert de preuve sanitaire, c'est
            // pire qu'un fichier orphelin de quelques centaines de kilo-octets.
            const { error } = await this.supabase
                .from('receptions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            if (photos && photos.length > 0) {
                const { error: removeError } = await this.supabase.storage
                    .from('receptions')
                    .remove(photos.map(p => p.storage_path));
                if (removeError) console.error('Erreur suppression fichiers réception:', removeError);
            }

            return { success: true };
        } catch (error) {
            console.error('Erreur suppression réception:', error);
            return { success: false, error: error.message };
        }
    }

    // Chemin `<receptionId>/<horodatage>-<aléatoire>.jpg` : `fichier` est déjà
    // compressé en JPEG par l'appelant (voir compresserImage dans app.js),
    // sauf repli sur l'original si la compression a échoué.
    async uploadReceptionPhoto(receptionId, fichier) {
        try {
            const chemin = `${receptionId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

            const { error: uploadError } = await this.supabase.storage
                .from('receptions')
                .upload(chemin, fichier);

            if (uploadError) throw uploadError;

            const { data, error } = await this.supabase
                .from('reception_photos')
                .insert([{
                    reception_id: receptionId,
                    storage_path: chemin,
                    taille_octets: fichier.size || null
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erreur envoi photo réception:', error);
            return { success: false, error: error.message };
        }
    }

    // L'espace `receptions` N'EST PAS public : une adresse publique ne
    // mènerait nulle part. Adresse SIGNÉE, valable 1 heure, à la place.
    async getPhotoUrl(storagePath) {
        try {
            const { data, error } = await this.supabase.storage
                .from('receptions')
                .createSignedUrl(storagePath, 3600);

            if (error) throw error;
            return { success: true, data: data.signedUrl };
        } catch (error) {
            console.error('Erreur génération adresse photo:', error);
            return { success: false, error: error.message };
        }
    }

    // Une seule requête pour TOUTES les vignettes d'un écran, au lieu d'un
    // appel réseau par photo : au comptoir, sur un réseau médiocre, la
    // différence entre 1 et 300 appels simultanés est celle entre une page
    // qui s'affiche et une page qui reste blanche.
    async getPhotoUrls(storagePaths) {
        try {
            if (!storagePaths || storagePaths.length === 0) {
                return { success: true, data: {} };
            }

            const { data, error } = await this.supabase.storage
                .from('receptions')
                .createSignedUrls(storagePaths, 3600);

            if (error) throw error;

            // Supabase renvoie une entrée par chemin, chacune avec sa propre
            // erreur éventuelle : une photo manquante ne doit pas emporter
            // les autres.
            const parChemin = {};
            (data || []).forEach(entree => {
                if (entree.signedUrl && !entree.error) {
                    parChemin[entree.path] = entree.signedUrl;
                }
            });
            return { success: true, data: parChemin };
        } catch (error) {
            console.error('Erreur génération adresses photos:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteReceptionPhoto(id, storagePath) {
        try {
            const { error: removeError } = await this.supabase.storage
                .from('receptions')
                .remove([storagePath]);
            if (removeError) throw removeError;

            const { error } = await this.supabase
                .from('reception_photos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression photo réception:', error);
            return { success: false, error: error.message };
        }
    }

}

// Instance globale
const db = new DatabaseManager();
