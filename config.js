// Configuration Supabase
// À REMPLIR après avoir créé votre projet Supabase
const SUPABASE_CONFIG = {
    url: 'https://omftmjajbizctzrsxmxu.supabase.co', // ex: https://xxxxx.supabase.co
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZnRtamFqYml6Y3R6cnN4bXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTM2MzgsImV4cCI6MjA3OTA4OTYzOH0.yqa454otDNzFAHvm8UIgu6nH1nIl1xNv4j2JCYR3cOg' // Clé publique anon
};

// Configuration des alertes
const ALERT_CONFIG = {
    // Email pour les notifications (sera rempli par l'utilisateur dans l'interface)
    emailEnabled: false,
    emailRecipient: '',

    // WhatsApp pour les notifications (numéro au format international) ou
    whatsappEnabled: false,
    whatsappNumber: '' // ex: +596696123456
};

// Catégories fixes du restaurant
const CATEGORIES = [
    { id: 'frais', name: 'Stock Frais', icon: '🧀' },
    { id: 'sec', name: 'Stock Sec', icon: '🌾' },
    { id: 'surgele', name: 'Stock Surgelé', icon: '❄️' },
    { id: 'consommables', name: 'Stock Consommable', icon: '🥢' },
    { id: 'boissons', name: 'Stock Boissons', icon: '🧃' },
    { id: 'autre', name: 'Autre', icon: '📦' }
];

