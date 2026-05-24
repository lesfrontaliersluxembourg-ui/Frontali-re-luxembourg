-- Migration : mise à jour des offres partenaires + ajout de 2 nouveaux partenaires
-- À exécuter dans Supabase → SQL Editor

-- 1. Mise à jour Samaramuse
UPDATE partners
SET offer = '1 mois d''abonnement offert + 20% de réduction sur toutes les prestations'
WHERE id = 6;

-- 2. Mise à jour Fidolux
UPDATE partners
SET offer = '250€ comptabilité / 1 000€ de réduction sur la constitution d''une société au Luxembourg'
WHERE id = 1;

-- 3. Ajout South Barber Luxembourg
INSERT INTO partners (id, name, type, offer)
VALUES (7, 'South Barber Luxembourg', 'Barbier', '10% de réduction sur toutes les prestations')
ON CONFLICT (id) DO UPDATE
  SET name  = EXCLUDED.name,
      type  = EXCLUDED.type,
      offer = EXCLUDED.offer;

-- 4. Ajout Right Road Languages
INSERT INTO partners (id, name, type, offer)
VALUES (8, 'Right Road Languages', 'Cours de langues', '80€ de réduction sur la formule 16h de cours par mois')
ON CONFLICT (id) DO UPDATE
  SET name  = EXCLUDED.name,
      type  = EXCLUDED.type,
      offer = EXCLUDED.offer;
