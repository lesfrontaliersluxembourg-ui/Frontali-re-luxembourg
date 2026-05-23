-- Migration : ajoute la colonne stripe_customer_id à la table members
-- À exécuter dans Supabase → SQL Editor avant d'activer le webhook Stripe

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index pour accélérer la recherche par customer Stripe (désactivation d'abonnement)
CREATE INDEX IF NOT EXISTS members_stripe_customer_id_idx
  ON members (stripe_customer_id);
