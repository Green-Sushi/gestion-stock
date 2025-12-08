-- Migration pour créer la table d'historique des messages récapitulatifs envoyés
-- Cette table stocke tous les messages récapitulatifs envoyés via WhatsApp ou Email

CREATE TABLE IF NOT EXISTS message_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    send_method VARCHAR(10) NOT NULL CHECK (send_method IN ('whatsapp', 'email')),
    recipient VARCHAR(255) NOT NULL,
    message_content TEXT NOT NULL,
    product_count INTEGER NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX idx_message_history_user_id ON message_history(user_id);
CREATE INDEX idx_message_history_sent_at ON message_history(sent_at DESC);
CREATE INDEX idx_message_history_send_method ON message_history(send_method);

-- Commentaires
COMMENT ON TABLE message_history IS 'Historique des messages récapitulatifs envoyés';
COMMENT ON COLUMN message_history.user_id IS 'Utilisateur qui a envoyé le message';
COMMENT ON COLUMN message_history.send_method IS 'Méthode d''envoi: whatsapp ou email';
COMMENT ON COLUMN message_history.recipient IS 'Destinataire (numéro WhatsApp ou email)';
COMMENT ON COLUMN message_history.message_content IS 'Contenu complet du message envoyé';
COMMENT ON COLUMN message_history.product_count IS 'Nombre de produits en alerte dans ce message';
COMMENT ON COLUMN message_history.sent_at IS 'Date et heure d''envoi du message';
