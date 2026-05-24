-- Migration : ajoute email et téléphone à la table members
-- À exécuter dans Supabase → SQL Editor

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;
