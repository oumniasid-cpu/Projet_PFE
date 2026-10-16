-- ============================================================
-- Admin notification system : audit log + per-admin notifications
-- PostgreSQL 12+
-- ============================================================

-- 1) AUDIT TRAIL: one immutable row per update made by a chef de projet / ingénieur.
--    Never deleted when an admin dismisses a notification.
--    Names are denormalised on purpose: the history stays readable
--    even if a project, task or user is renamed or deleted later.
CREATE TABLE IF NOT EXISTS activity_log (
  id            BIGSERIAL PRIMARY KEY,
  actor_id      INT         REFERENCES users(id)    ON DELETE SET NULL,
  actor_name    TEXT        NOT NULL,
  actor_role    TEXT        NOT NULL CHECK (actor_role IN ('chef_projet', 'ingenieur')),
  project_id    INT         REFERENCES projects(id) ON DELETE SET NULL,
  project_name  TEXT,
  task_id       INT,
  task_name     TEXT,
  action        TEXT        NOT NULL,   -- e.g. task_progress_updated, real_cost_updated, daily_report_submitted
  summary       TEXT        NOT NULL,
  priority      TEXT        NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log (project_id, created_at DESC);

-- 2) PER-ADMIN NOTIFICATIONS: read / archived state is per admin.
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    INT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id BIGINT NOT NULL REFERENCES activity_log(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  emailed_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (admin_id, activity_id)
);
CREATE INDEX IF NOT EXISTS idx_notif_admin_feed ON notifications (admin_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread
  ON notifications (admin_id) WHERE read_at IS NULL AND archived_at IS NULL;

-- 3) PREFERENCES (one row per admin, created on first save)
CREATE TABLE IF NOT EXISTS notification_preferences (
  admin_id       INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,    -- live pop-up alerts (feed is always available)
  email_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  frequency      TEXT    NOT NULL DEFAULT 'instant' CHECK (frequency IN ('instant', 'hourly', 'daily')),
  quiet_start    TIME,                              -- NULL = no quiet hours
  quiet_end      TIME,
  min_priority   TEXT    NOT NULL DEFAULT 'low' CHECK (min_priority IN ('low', 'normal', 'high', 'critical')),
  timezone       TEXT    NOT NULL DEFAULT 'Africa/Algiers',
  last_email_at  TIMESTAMPTZ
);