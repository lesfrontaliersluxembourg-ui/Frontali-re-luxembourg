-- Migration : ajoute la colonne deleted_at à la table members (soft delete)
-- À exécuter dans Supabase → SQL Editor

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index pour accélérer les requêtes qui filtrent sur deleted_at IS NULL
CREATE INDEX IF NOT EXISTS members_deleted_at_idx
  ON members (deleted_at)
  WHERE deleted_at IS NULL;
