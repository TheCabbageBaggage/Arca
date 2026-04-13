const path = require('path');

const defaultDatabasePath = path.resolve(__dirname, '..', '..', '..', 'data', 'sqlite', 'arca.db');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databasePath: process.env.DATABASE_PATH || defaultDatabasePath,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  agentKeySecret: process.env.AGENT_KEY_SECRET || 'dev-agent-key-secret-change-me',
  llmDefaultProvider: process.env.LLM_DEFAULT_PROVIDER || 'anthropic',
  llmDefaultModel: process.env.LLM_DEFAULT_MODEL || 'claude-sonnet-4-20250514',
  llmFallbackProvider: process.env.LLM_FALLBACK_PROVIDER || 'ollama',
  llmFallbackModel: process.env.LLM_FALLBACK_MODEL || 'llama3.1',
  llmConfidentialProvider: process.env.LLM_CONFIDENTIAL_PROVIDER || 'ollama',
  llmOllamaBaseUrl: process.env.OLLAMA_BASE_URL || null,
  llmLmStudioBaseUrl: process.env.LM_STUDIO_BASE_URL || null,
  llmCostThresholdUsd: Number(process.env.LLM_COST_THRESHOLD_USD || 0.5),
  llmTaskRouting: {
    architecture: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    code_review: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    code_generation: { provider: 'ollama', model: 'qwen2.5-coder' },
    data_entry: { provider: 'groq', model: 'llama3-70b' },
    bulk_ops: { provider: 'ollama', model: 'llama3.1' },
    default: { provider: process.env.LLM_DEFAULT_PROVIDER || 'anthropic', model: process.env.LLM_DEFAULT_MODEL || 'claude-sonnet-4-20250514' }
  },
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@arca.local',
  bootstrapAdminName: process.env.BOOTSTRAP_ADMIN_NAME || 'Arca Admin',
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin1234'
};

module.exports = env;
