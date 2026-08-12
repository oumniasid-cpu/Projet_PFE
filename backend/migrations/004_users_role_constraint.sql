-- ============================================================
-- 004_users_role_constraint.sql
-- Sécurise la colonne users.role (aucune contrainte n'existait :
-- n'importe quelle chaîne pouvait y être stockée).
--
-- Convention conservée : valeurs en minuscules, alignée sur
-- routes/task_routes.js et routes/import_routes.js (adminRoles,
-- supervisorRoles). 'user' est gardé comme valeur héritée pour ne
-- pas casser les comptes existants ; les nouveaux comptes utilisent
-- désormais 'membre_equipe' par défaut (rôle de base du cahier des
-- charges BuildTrack DZ).
--
-- Idempotent. Ne supprime aucune donnée.
-- ============================================================

BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'admin',
    'chef_projet',
    'ingenieur',
    'conducteur_travaux',
    'maitre_ouvrage',
    'bureau_etude',
    'membre_equipe',
    'user'              -- valeur héritée, conservée pour compatibilité
  ));

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'membre_equipe';

COMMIT;

-- ---- Vérification : liste les utilisateurs et leur rôle actuel ----
SELECT id, email, name, role FROM users ORDER BY id;

-- ---- Pour promouvoir un utilisateur en admin, décommentez et adaptez : ----
-- UPDATE users SET role = 'admin' WHERE email = 'votre.email@exemple.com';