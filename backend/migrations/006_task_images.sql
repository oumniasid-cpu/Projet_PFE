CREATE TABLE IF NOT EXISTS task_images (
  id SERIAL PRIMARY KEY,
  task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_images_task_id ON task_images(task_id);
