BEGIN;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS planned_budget DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS import_source VARCHAR(50);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id INT REFERENCES tasks(id),
  ADD COLUMN IF NOT EXISTS wbs_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS planned_start DATE,
  ADD COLUMN IF NOT EXISTS planned_end DATE,
  ADD COLUMN IF NOT EXISTS actual_start DATE,
  ADD COLUMN IF NOT EXISTS actual_end DATE,
  ADD COLUMN IF NOT EXISTS duration_days INT,
  ADD COLUMN IF NOT EXISTS progress_percent DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_cost DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responsible_user_id INT REFERENCES users(id);

UPDATE tasks SET name = title WHERE name IS NULL AND title IS NOT NULL;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in-progress', 'completed', 'not_started', 'in_progress', 'done', 'delayed'));

CREATE TABLE IF NOT EXISTS task_dependencies (
  id SERIAL PRIMARY KEY,
  task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(10) DEFAULT 'FS'
);

CREATE TABLE IF NOT EXISTS import_logs (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  imported_by INT REFERENCES users(id),
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  imported_at TIMESTAMP DEFAULT NOW(),
  rows_imported INT,
  status VARCHAR(50),
  error_log TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_wbs ON tasks(project_id, wbs_code);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_project ON import_logs(project_id);

COMMIT;
