CREATE DATABASE buildtrack;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
  --profile_photo VARCHAR(255) DEFAULT 'default.png', -- new column for profile photo
    --created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

select * from users;
-- Script SQL pour mettre à jour la base de données buildtrack
-- Exécutez ce script dans psql : \i update_database.sql

-- ============================================
-- 1. METTRE À JOUR LA TABLE USERS
-- ============================================

-- Ajouter les colonnes manquantes à la table users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(100),
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255) DEFAULT 'default.png',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Mettre à jour les users existants pour avoir un nom
UPDATE users SET name = 'User' WHERE name IS NULL;

-- Rendre le nom obligatoire maintenant
ALTER TABLE users ALTER COLUMN name SET NOT NULL;

-- ============================================
-- 2. CRÉER LA TABLE PROJECTS
-- ============================================

-- 1. Create the projects table with updated status options and a client_name column
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  client_name VARCHAR(200), -- Added to store the client from your image
  description TEXT,
  -- Updated CHECK constraint to match the statuses in your image
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled', 'on track', 'at risk', 'delayed')),
  budget_total DECIMAL(12, 2) DEFAULT 0 CHECK (budget_total >= 0),
  budget_spent DECIMAL(12, 2) DEFAULT 0 CHECK (budget_spent >= 0),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location_address VARCHAR(255),
  location_city VARCHAR(100),
  location_country VARCHAR(100),
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT end_after_start CHECK (end_date >= start_date)
);

-- 2. Create the project_members table
CREATE TABLE IF NOT EXISTS project_members (
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

-- Add the missing client_name column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(200);

-- Update the status check constraint to allow your new statuses
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled', 'on track', 'at risk', 'delayed'));
-- 3. Corrected Insertion (Matching the design image exactly)
INSERT INTO projects (name, client_name, status, progress, budget_spent, budget_total, start_date, end_date, owner_id)
VALUES 
('Downtown Office Tower', 'Metro Development Corp', 'on track', 68, 8200000, 12500000, '2024-01-01', '2025-06-15', 1),
('Harbor Bridge Expansion', 'City Transportation Dept', 'at risk', 42, 19500000, 28000000, '2023-05-10', '2025-12-01', 1),
('Municipal Water Treatment', 'City Utilities Board', 'completed', 100, 15200000, 16000000, '2022-10-01', '2024-08-20', 1),
('Riverside Residential Complex', 'Greenfield Homes LLC', 'delayed', 31, 4100000, 13200000, '2024-02-01', '2026-01-10', 1),
('Tech Campus Phase 2', 'InnovateTech Inc', 'on track', 85, 12000000, 14500000, '2023-11-01', '2025-10-30', 1);-- ============================================



-- 3. CRÉER LA TABLE TASKS
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'completed')),
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- ============================================
-- 4. CRÉER LES INDEX POUR LES PERFORMANCES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================
-- 5. CRÉER LA FONCTION DE MISE À JOUR AUTO
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 6. CRÉER LES TRIGGERS
-- ============================================

-- Trigger pour users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
	-- Trigger pour projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. INSÉRER DES DONNÉES DE TEST (Optionnel)
-- ============================================

-- Projet de test (décommentez si vous voulez des données de test)

INSERT INTO projects (
  name, description, budget_total, budget_spent, progress,
  start_date, end_date, status, owner_id
) VALUES 
(
  'Tour Résidentielle Centre-Ville',
  'Construction d''une tour résidentielle de 20 étages avec 150 appartements',
  2500000, 
  1200000, 
  48,
  '2024-01-15',
  '2024-12-31',
  'active',
  1  -- Remplacez par l'ID de votre utilisateur
),
(
  'Centre Commercial Sud',
  'Rénovation complète du centre commercial avec nouveaux espaces',
  1800000,
  950000,
  53,
  '2024-02-01',
  '2024-11-30',
  'active',
  1
),
(
  'Parking Souterrain',
  'Construction d''un parking souterrain de 3 niveaux - 200 places',
  900000,
  150000,
  17,
  '2024-03-01',
  '2025-03-31',
  'active',
  1
);

-- Tâches de test
INSERT INTO tasks (title, description, project_id, status, due_date) VALUES
  ('Fondations et terrassement', 'Préparation du terrain et coulage des fondations', 1, 'completed', '2024-04-01'),
  ('Structure béton', 'Construction de la structure en béton armé', 1, 'in-progress', '2024-08-15'),
  ('Façade et menuiseries', 'Installation de la façade et des menuiseries', 1, 'todo', '2024-10-30'),
  ('Électricité et plomberie', 'Installation des réseaux électriques et sanitaires', 1, 'todo', '2024-11-15'),
  
  ('Démolition existant', 'Démolition des anciennes structures', 2, 'completed', '2024-03-15'),
  ('Gros œuvre', 'Travaux de gros œuvre et renforcement', 2, 'in-progress', '2024-07-30'),
  ('Aménagements intérieurs', 'Aménagement des espaces commerciaux', 2, 'todo', '2024-10-15'),
  
  ('Études techniques', 'Études de sol et plans techniques', 3, 'completed', '2024-04-15'),
  ('Excavation', 'Excavation du terrain sur 3 niveaux', 3, 'in-progress', '2024-09-30'),
  ('Structure parking', 'Construction de la structure du parking', 3, 'todo', '2025-01-15');


-- ============================================
-- 8. VÉRIFICATION
-- ============================================

-- Afficher toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Afficher la structure de chaque table


-- Compter les enregistrements
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks;

-- Message de succès
DO $$
BEGIN
    RAISE NOTICE '✅ Base de données mise à jour avec succès !';
    RAISE NOTICE '📊 Tables créées : users (mise à jour), projects, tasks';
    RAISE NOTICE '🚀 Vous pouvez maintenant démarrer le backend';
END $$;

-- Trouvez votre ID utilisateur
SELECT id, email FROM users WHERE email = 'aaaa@gmail.com';
-- Vous verrez : id = 5 (par exemple)

-- Créez 3 projets de test
INSERT INTO projects (name, description, budget_total, budget_spent, progress, start_date, end_date, status, owner_id)
VALUES 
('Tour Résidentielle', 'Construction tour 20 étages', 2500000, 1200000, 48, '2024-01-01', '2024-12-31', 'active', 5),
('Centre Commercial', 'Rénovation centre commercial', 1800000, 950000, 53, '2024-02-01', '2024-11-30', 'active', 5),
('Parking Souterrain', 'Construction parking 3 niveaux', 900000, 150000, 17, '2024-03-01', '2025-03-31', 'active', 5);

-- Vérifier que ça a marché
SELECT id, name, budget_total, progress, status FROM projects;
SELECT id, name, owner_id FROM projects;
SELECT id, email FROM users;

SELECT id, name, owner_id FROM projects;

-- Quitter
