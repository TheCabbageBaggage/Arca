const fs = require('fs');
const os = require('os');
const path = require('path');

const projectsRoutesPath = path.join(__dirname, '..', '..', 'api', 'projects.routes.js');
const tokensRoutesPath = path.join(__dirname, '..', '..', 'api', 'tokens.routes.js');

const projectHandlerAliases = {
  listProjects: ['listProjects', 'getProjects'],
  createProject: ['createProject', 'postProject'],
  listProjectSprints: ['listProjectSprints', 'getProjectSprints'],
  createSprint: ['createSprint', 'createProjectSprint', 'postProjectSprint'],
  createUserStory: ['createUserStory', 'createStory', 'postUserStory'],
  updateUserStoryStatus: ['updateUserStoryStatus', 'patchUserStoryStatus', 'setUserStoryStatus'],
  estimateUserStoryTokens: ['estimateUserStoryTokens', 'estimateTokens', 'createUserStoryEstimate'],
  getSprintBurndown: ['getSprintBurndown', 'listSprintBurndown', 'burndown']
};

const tokenHandlerAliases = {
  listTokenUsage: ['listTokenUsage', 'getTokenUsage'],
  getSprintTokenBudget: ['getSprintTokenBudget', 'getTokenBudget', 'budgetStatus'],
  getTokenCostForecast: ['getTokenCostForecast', 'costForecast', 'forecastTokens']
};

function purgeBackendModules() {
  const marker = `${path.sep}backend${path.sep}src${path.sep}`;
  for (const cacheKey of Object.keys(require.cache)) {
    if (cacheKey.includes(marker)) {
      delete require.cache[cacheKey];
    }
  }
}

function routeModuleExists(filePath) {
  return fs.existsSync(filePath);
}

function pickHandler(router, aliases) {
  if (!router || !router.handlers) {
    return null;
  }

  for (const alias of aliases) {
    const handler = router.handlers[alias];
    if (typeof handler === 'function') {
      return handler;
    }
  }

  return null;
}

function loadRouteModule(filePath, aliasMap) {
  if (!routeModuleExists(filePath)) {
    return null;
  }

  const router = require(filePath);
  const handlers = {};

  for (const [canonicalName, aliases] of Object.entries(aliasMap)) {
    handlers[canonicalName] = pickHandler(router, aliases);
  }

  return {
    router,
    handlers
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
      return this;
    }
  };
}

async function invoke(handler, req = {}) {
  if (typeof handler !== 'function') {
    throw new Error('A route handler function is required');
  }

  const res = createResponse();
  let nextError = null;

  try {
    await handler(req, res, (error) => {
      nextError = error || null;
    });
  } catch (error) {
    nextError = error;
  }

  return {
    error: nextError,
    res
  };
}

function seedReferenceData(db) {
  const contacts = db.prepare(
    `INSERT OR IGNORE INTO contacts (contact_no, type, name, is_active)
     VALUES (?, ?, ?, 1)`
  );

  contacts.run('C-20001', 'debtor', 'Project Client');
  contacts.run('C-20002', 'vendor', 'Project Vendor');

  const providers = db.prepare(
    `INSERT OR IGNORE INTO llm_providers (
      name, provider_type, base_url, api_key_env, default_model, is_active, is_local, routing_priority
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
  );

  providers.run('anthropic', 'cloud', 'https://api.anthropic.com', 'ANTHROPIC_API_KEY', 'claude-sonnet-4-20250514', 0, 10);
  providers.run('openai', 'cloud', 'https://api.openai.com', 'OPENAI_API_KEY', 'gpt-4o', 0, 20);
  providers.run('groq', 'cloud', 'https://api.groq.com', 'GROQ_API_KEY', 'llama3-70b-8192', 0, 30);
  providers.run('ollama', 'local', 'http://host.docker.internal:11434', null, 'llama3.1', 1, 5);
}

function insertBurndownEvent(db, input) {
  const result = db.prepare(
    `INSERT INTO sprint_burndown_events (
      sprint_id, story_id, event_type, consumed_tokens, remaining_tokens, note,
      recorded_by_type, recorded_by_id, recorded_by_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.sprintId,
    input.storyId || null,
    input.eventType || 'consumed',
    input.consumedTokens,
    input.remainingTokens,
    input.note || 'seeded for test',
    input.recordedByType || 'human',
    input.recordedById || 'u_admin',
    input.recordedByName || 'Admin User'
  );

  return db.prepare('SELECT * FROM sprint_burndown_events WHERE id = ?').get(result.lastInsertRowid);
}

async function createM6Harness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arca-m6-test-'));
  const dbPath = path.join(tmpDir, 'm6.db');

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = dbPath;
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.AGENT_KEY_SECRET = 'test-agent-secret';
  process.env.LLM_DEFAULT_PROVIDER = 'anthropic';
  process.env.LLM_DEFAULT_MODEL = 'claude-sonnet-4-20250514';
  process.env.LLM_FALLBACK_PROVIDER = 'ollama';
  process.env.LLM_FALLBACK_MODEL = 'llama3.1';
  process.env.LLM_CONFIDENTIAL_PROVIDER = 'ollama';

  purgeBackendModules();

  const { migrate } = require('../../db/migrator');
  const { openDatabase, closeDatabase } = require('../../db/client');

  migrate();

  const db = openDatabase();
  seedReferenceData(db);

  const projectsRoutes = loadRouteModule(projectsRoutesPath, projectHandlerAliases);
  const tokensRoutes = loadRouteModule(tokensRoutesPath, tokenHandlerAliases);

  return {
    db,
    projectsRoutes,
    tokensRoutes,
    projectsHandlers: projectsRoutes ? projectsRoutes.handlers : {},
    tokensHandlers: tokensRoutes ? tokensRoutes.handlers : {},
    hasProjectsRoutes: Boolean(projectsRoutes),
    hasTokensRoutes: Boolean(tokensRoutes),
    invoke,
    insertBurndownEvent(input) {
      return insertBurndownEvent(db, input);
    },
    async close() {
      closeDatabase();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  };
}

const m6RoutesAvailable = routeModuleExists(projectsRoutesPath) && routeModuleExists(tokensRoutesPath);

module.exports = {
  createM6Harness,
  m6RoutesAvailable
};
