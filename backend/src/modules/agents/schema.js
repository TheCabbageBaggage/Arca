const { openDatabase } = require('../../db/client');

function ensureAgentSchema() {
  const db = openDatabase();
  const requiredTables = ['llm_providers', 'llm_routing_rules', 'agent_tasks', 'token_usage'];
  const missing = requiredTables.filter((name) => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
      .get(name);
    return !row;
  });

  if (missing.length > 0) {
    const error = new Error(
      `Missing M3 tables: ${missing.join(', ')}. Run 'npm run db:migrate' before using agent modules.`
    );
    error.statusCode = 500;
    throw error;
  }

  seedProviders(db);

  return db;
}

function seedProviders(db) {
  const providers = [
    {
      name: 'anthropic',
      base_url: 'https://api.anthropic.com',
      api_key_env: 'ANTHROPIC_API_KEY',
      default_model: 'claude-sonnet-4-20250514',
      is_local: 0,
      routing_priority: 10
    },
    {
      name: 'openai',
      base_url: 'https://api.openai.com',
      api_key_env: 'OPENAI_API_KEY',
      default_model: 'gpt-4o',
      is_local: 0,
      routing_priority: 20
    },
    {
      name: 'groq',
      base_url: 'https://api.groq.com',
      api_key_env: 'GROQ_API_KEY',
      default_model: 'llama3-70b-8192',
      is_local: 0,
      routing_priority: 30
    },
    {
      name: 'ollama',
      base_url: process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434',
      api_key_env: null,
      default_model: 'llama3.1',
      is_local: 1,
      routing_priority: 5
    },
    {
      name: 'lm_studio',
      base_url: process.env.LM_STUDIO_BASE_URL || 'http://host.docker.internal:1234',
      api_key_env: null,
      default_model: 'local-model',
      is_local: 1,
      routing_priority: 15
    }
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO llm_providers (
      name, provider_type, base_url, api_key_env, default_model, is_active, is_local, routing_priority
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const update = db.prepare(`
    UPDATE llm_providers
       SET base_url = ?, api_key_env = ?, default_model = ?, is_active = 1, is_local = ?, routing_priority = ?, updated_at = CURRENT_TIMESTAMP
     WHERE name = ?
  `);

  for (const provider of providers) {
    const result = insert.run(
      provider.name,
      provider.is_local ? 'local' : 'cloud',
      provider.base_url,
      provider.api_key_env,
      provider.default_model,
      provider.is_local,
      provider.routing_priority
    );

    if (result.changes === 0) {
      update.run(
        provider.base_url,
        provider.api_key_env,
        provider.default_model,
        provider.is_local,
        provider.routing_priority,
        provider.name
      );
    }
  }
}

module.exports = {
  ensureAgentSchema
};
