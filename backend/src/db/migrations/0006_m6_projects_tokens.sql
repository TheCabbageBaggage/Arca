CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  code TEXT,
  client_contact_id INTEGER REFERENCES contacts(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned', 'active', 'on_hold', 'completed', 'archived')),
  methodology TEXT NOT NULL DEFAULT 'scrum' CHECK (methodology IN ('scrum', 'kanban', 'safe', 'hybrid')),
  start_date DATE,
  end_date DATE,
  token_budget INTEGER NOT NULL DEFAULT 0 CHECK (token_budget >= 0),
  notes TEXT,
  nextcloud_path TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sprint_no TEXT NOT NULL UNIQUE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'review', 'closed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  velocity_tokens INTEGER NOT NULL DEFAULT 0 CHECK (velocity_tokens >= 0),
  committed_tokens INTEGER NOT NULL DEFAULT 0 CHECK (committed_tokens >= 0),
  consumed_tokens INTEGER NOT NULL DEFAULT 0 CHECK (consumed_tokens >= 0),
  remaining_tokens INTEGER NOT NULL DEFAULT 0,
  nextcloud_path TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sprint_token_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sprint_id INTEGER NOT NULL UNIQUE REFERENCES sprints(id) ON DELETE CASCADE,
  budget_tokens INTEGER NOT NULL CHECK (budget_tokens >= 0),
  budget_usd REAL,
  warn_threshold REAL NOT NULL DEFAULT 0.85 CHECK (warn_threshold >= 0 AND warn_threshold <= 1),
  hard_limit INTEGER NOT NULL DEFAULT 0 CHECK (hard_limit IN (0, 1)),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_no TEXT NOT NULL UNIQUE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  acceptance_criteria_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'ready', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  estimated_tokens INTEGER NOT NULL DEFAULT 0 CHECK (estimated_tokens >= 0),
  actual_tokens INTEGER NOT NULL DEFAULT 0 CHECK (actual_tokens >= 0),
  nextcloud_path TEXT,
  created_by_type TEXT,
  created_by_id TEXT,
  created_by_name TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS story_token_estimates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  estimate_tokens INTEGER NOT NULL CHECK (estimate_tokens >= 0),
  model TEXT,
  provider TEXT,
  confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
  rationale TEXT,
  created_by_type TEXT,
  created_by_id TEXT,
  created_by_name TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sprint_burndown_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  story_id INTEGER REFERENCES user_stories(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'consumed' CHECK (event_type IN ('planned', 'consumed', 'added', 'removed', 'adjusted')),
  consumed_tokens INTEGER NOT NULL DEFAULT 0 CHECK (consumed_tokens >= 0),
  remaining_tokens INTEGER NOT NULL DEFAULT 0 CHECK (remaining_tokens >= 0),
  note TEXT,
  recorded_by_type TEXT,
  recorded_by_id TEXT,
  recorded_by_name TEXT,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client_contact ON projects(client_contact_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_sprints_project_status ON sprints(project_id, status);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sprint_token_budgets_sprint_id ON sprint_token_budgets(sprint_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_project_status ON user_stories(project_id, status);
CREATE INDEX IF NOT EXISTS idx_user_stories_sprint_status ON user_stories(sprint_id, status);
CREATE INDEX IF NOT EXISTS idx_user_stories_priority ON user_stories(priority);
CREATE INDEX IF NOT EXISTS idx_story_token_estimates_story_created_at ON story_token_estimates(story_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sprint_burndown_events_sprint_recorded_at ON sprint_burndown_events(sprint_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_sprint_burndown_events_story_id ON sprint_burndown_events(story_id);
