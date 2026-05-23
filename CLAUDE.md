# La Frontalière Club — Instructions pour Claude Code

## Contexte
Application de gestion de club pour La Frontalière Club (Maryam).
Supabase déjà configuré avec les tables et données.

## Identifiants Supabase
- URL: https://omwxkrojyhfsurqqbqxb.supabase.co
- Clé publique: sb_publishable_scllXlTsp06XkT37RgOSMA_I-OaTlnz

## Tables Supabase existantes
- members (id, first_name, last_name, plan, active, created_at)
- partners (id, name, type, offer) — déjà remplie avec 6 partenaires
- visits (id, member_id, partner_id, visited_at)

## Ce qu'il faut construire

### Stack
- Next.js 14 (App Router)
- Supabase JS
- qrcode (npm) pour générer les QR codes
- TailwindCSS

### Deux interfaces séparées

#### 1. Interface Admin (/admin)
- Onglet Partenaires : liste des 6 partenaires avec leurs offres
- Onglet Membres : 
  - Formulaire pour ajouter un membre (prénom, nom, plan: Mensuel/Annuel)
  - Liste des membres avec badges plan et statut actif/inactif
  - Bouton Désactiver/Réactiver par membre
  - Bouton "Générer QR Code" → génère une image PNG du QR code à télécharger
  - Le QR code encode l'URL : /scan/[member_id]
- Onglet Historique : liste des visites (membre, partenaire, date)

#### 2. Interface Commerçant (/scan/[member_id])
- Page publique accessible par scan du QR code
- Affiche automatiquement :
  - Nom/prénom du membre
  - Badge plan (Mensuel/Annuel)
  - Si membre inactif → message rouge "Ce membre n'est plus actif" et bloquer
  - Liste déroulante pour choisir le partenaire
  - Si membre Mensuel + partenaire Fidolux ou Colors → message rouge "Réservé aux membres Annuel" et bloquer
  - Sinon → afficher l'offre du partenaire + bouton vert "Valider la visite"
  - Après validation → message de confirmation vert

### Règles métier
- Plan Annuel → accès à tous les partenaires
- Plan Mensuel → accès à tous SAUF Fidolux (id:1) et Colors (id:4)
- Membre inactif → accès bloqué chez tous les partenaires

### QR Code
- Générer avec la librairie `qrcode`
- L'URL encodée : https://[domaine]/scan/[member_id]
- Téléchargeable en PNG depuis l'interface admin
- Maryam l'envoie ensuite au membre par WhatsApp

## Commandes pour démarrer
```
npm install
npm run dev
```

## Notes importantes
- Pas d'authentification nécessaire pour la V1
- La page /scan/[member_id] doit fonctionner sur mobile (commerçant scanne avec son téléphone)
- Design simple et lisible sur petit écran
