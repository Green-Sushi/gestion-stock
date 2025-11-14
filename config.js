// Configuration Supabase
// À REMPLIR après avoir créé votre projet Supabase
const SUPABASE_CONFIG = {
    url: 'VOTRE_URL_SUPABASE', // ex: https://xxxxx.supabase.co
    key: 'VOTRE_CLE_PUBLIQUE_SUPABASE' // Clé publique anon
};

// Configuration des alertes
const ALERT_CONFIG = {
    // Email pour les notifications (sera rempli par l'utilisateur dans l'interface)
    emailEnabled: false,
    emailRecipient: '',

    // WhatsApp pour les notifications (numéro au format international)
    whatsappEnabled: false,
    whatsappNumber: '' // ex: +596696123456
};

// Catégories fixes du restaurant
const CATEGORIES = [
    { id: 'frais', name: 'Stock Frais', icon: '🧀' },
    { id: 'sec', name: 'Stock Sec', icon: '🌾' },
    { id: 'surgele', name: 'Stock Surgelé', icon: '❄️' },
    { id: 'consommable', name: 'Stock Consommable', icon: '🥢' },
    { id: 'boisson', name: 'Stock Boissons', icon: '🧃' }
];
