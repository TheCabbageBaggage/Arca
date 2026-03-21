CREATE TABLE IF NOT EXISTS llm_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL,
  base_url TEXT,
  api_key_env TEXT,
  default_model TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_local INTEGER NOT NULL DEFAULT 0 CHECK (is_local IN (0, 1)),
  routing_priority INTEGER NOT NULL DEFAULT 10,
  capabilities TEXT NOT NULL DEFAULT '[]',
  metadata TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS llm_routing_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  priority INTEGER NOT NULL,
  condition_field TEXT NOT NULL,
  condition_op TEXT NOT NULL,
  condition_value TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  model TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  fallback_provider_name TEXT,
  fallback_model TEXT,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_name) REFERENCES llm_providers(name),
  FOREIGN KEY (fallback_provider_name) REFERENCES llm_providers(name)
);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL UNIQUE,
  parent_task_id TEXT,
  agent_type TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'waiting_approval', 'done', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 5,
  queue_name TEXT NOT NULL DEFAULT 'default',
  instruction TEXT,
  request_payload TEXT NOT NULL DEFAULT '{}',
  result_payload TEXT,
  error_text TEXT,
  provider_name TEXT,
  model TEXT,
  provider_route_reason TEXT,
  estimated_tokens INTEGER,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  progress REAL DEFAULT 0,
  created_by_type TEXT,
  created_by_id TEXT,
  created_by_name TEXT,
  request_id TEXT,
  session_id TEXT,
  correlation_id TEXT,
  approved_by TEXT,
  approved_at DATETIME,
  started_at DATETIME,
  completed_at DATETIME,
  failed_at DATETIME,
  next_retry_at DATETIME,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT,
  provider_name TEXT NOT NULL,
  model TEXT NOT NULL,
  task_type TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  usage_payload TEXT,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES agent_tasks(task_id),
  FOREIGN KEY (provider_name) REFERENCES llm_providers(name)
);

CREATE INDEX IF NOT EXISTS idx_llm_providers_active ON llm_providers(is_active, routing_priority);
CREATE INDEX IF NOT EXISTS idx_llm_routing_rules_active_priority ON llm_routing_rules(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_llm_routing_rules_field ON llm_routing_rules(condition_field, condition_op);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status_created_at ON agent_tasks(status, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type_status ON agent_tasks(task_type, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_provider_model ON agent_tasks(provider_name, model);
CREATE INDEX IF NOT EXISTS idx_token_usage_task_id ON token_usage(task_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_provider_recorded_at ON token_usage(provider_name, recorded_at);
