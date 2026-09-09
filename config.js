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

// Numéro de version des illustrations. Sans lui, remplacer une image sans
// changer son nom de fichier ne servait à rien : le téléphone gardait
// l'ancienne en mémoire, parfois plusieurs jours. À incrémenter à CHAQUE
// remplacement d'illustration, comme on le fait déjà pour les scripts.
const VERSION_VISUELS = '20261007';

// Catégories fixes du restaurant
const CATEGORIES = [
    { id: 'frais', name: 'Stock Frais', icon: '🧀' },
    { id: 'sec', name: 'Stock Sec', icon: '🌾' },
    { id: 'surgele', name: 'Stock Surgelé', icon: '❄️' },
    { id: 'consommables', name: 'Stock Consommable', icon: '🥢' },
    { id: 'boissons', name: 'Stock Boissons', icon: '🧃' },
    { id: 'legumes', name: 'Légumes', icon: '🥬' },
    { id: 'hygiene', name: 'Hygiène', icon: '🧽' }
];


// ====================================================================
// FUSEAU HORAIRE DU RESTAURANT
// ====================================================================
// Les registres (congélation, surgélation, traçabilité) servent de PREUVE
// devant un contrôle sanitaire. Leurs dates doivent donc être celles du
// restaurant, quel que soit l'appareil qui les consulte : sans ça, la même
// réception apparaîtrait au 31 mars depuis la Martinique et au 1er avril
// depuis la métropole, et le registre changerait de contenu selon l'endroit
// d'où on le regarde.
//
// La Martinique est à UTC−4 toute l'année, sans changement d'heure — vérifié
// sur les douze mois. Le décalage est malgré tout demandé au système plutôt
// qu'écrit en dur : ce code ne pourra pas se tromper si la règle changeait.
const FUSEAU_RESTAURANT = 'America/Martinique';

// Décalage du restaurant par rapport au temps universel, en minutes, à un
// instant donné.
function decalageRestaurantMinutes(instant) {
    const parties = {};
    new Intl.DateTimeFormat('en-US', {
        timeZone: FUSEAU_RESTAURANT,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(instant).forEach(p => { parties[p.type] = p.value; });

    const luCommeUTC = Date.UTC(
        Number(parties.year), Number(parties.month) - 1, Number(parties.day),
        Number(parties.hour) % 24, Number(parties.minute), Number(parties.second)
    );
    return (luCommeUTC - instant.getTime()) / 60000;
}

// L'instant précis correspondant à une date et une heure LUES AU RESTAURANT.
// Sert aussi bien à enregistrer une saisie qu'à borner un filtre de période.
function instantRestaurant(annee, mois, jour, heure = 0, minute = 0) {
    const approximation = Date.UTC(annee, mois - 1, jour, heure, minute);
    const decalage = decalageRestaurantMinutes(new Date(approximation));
    return new Date(approximation - decalage * 60000);
}

// Les composantes d'une date TELLES QUE LUES AU RESTAURANT, en texte à deux
// chiffres. C'est ce qui permet de classer une fiche dans le bon mois.
function partiesDateRestaurant(valeur) {
    const instant = valeur instanceof Date ? valeur : new Date(valeur);
    const parties = {};
    new Intl.DateTimeFormat('en-CA', {
        timeZone: FUSEAU_RESTAURANT,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(instant).forEach(p => { parties[p.type] = p.value; });

    return {
        annee: parties.year,
        mois: parties.month,
        jour: parties.day,
        heure: String(Number(parties.hour) % 24).padStart(2, '0'),
        minute: parties.minute
    };
}

// Affichages, toujours à l'heure du restaurant.
function dateRestaurant(valeur, options = {}) {
    return new Date(valeur).toLocaleDateString('fr-FR', { timeZone: FUSEAU_RESTAURANT, ...options });
}

function heureRestaurant(valeur) {
    return new Date(valeur).toLocaleTimeString('fr-FR', {
        timeZone: FUSEAU_RESTAURANT, hour: '2-digit', minute: '2-digit'
    });
}

// Valeur à mettre dans un champ « date et heure » : l'heure qu'il est AU
// RESTAURANT, pas sur l'appareil.
function maintenantPourChampDateHeure() {
    const p = partiesDateRestaurant(new Date());
    return `${p.annee}-${p.mois}-${p.jour}T${p.heure}:${p.minute}`;
}

// Lecture d'un champ « date et heure » : ce que l'employé a tapé est de
// l'heure du restaurant, pas celle de l'appareil.
function instantDepuisChampDateHeure(valeur) {
    if (!valeur) return new Date();
    const [datePart, heurePart] = valeur.split('T');
    const [annee, mois, jour] = datePart.split('-').map(Number);
    const [heure, minute] = (heurePart || '00:00').split(':').map(Number);
    return instantRestaurant(annee, mois, jour, heure, minute);
}

// Une date SANS heure (une DLC : « 2026-03-31 ») n'a pas de fuseau : elle se
// reformate, elle ne se convertit pas. La faire passer par un instant serait
// le meilleur moyen de la décaler d'un jour.
function dateSeuleFr(valeur) {
    if (!valeur) return '—';
    const [annee, mois, jour] = String(valeur).split('-');
    return `${jour}/${mois}/${annee}`;
}

// La date du jour au restaurant, au format yyyy-mm-jj (dates sans heure :
// DLC, DLUO).
function aujourdhuiRestaurant() {
    const p = partiesDateRestaurant(new Date());
    return `${p.annee}-${p.mois}-${p.jour}`;
}
