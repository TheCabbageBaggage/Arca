const fs = require('fs');
const os = require('os');
const path = require('path');

function purgeBackendModules() {
  const marker = `${path.sep}backend${path.sep}src${path.sep}`;
  for (const cacheKey of Object.keys(require.cache)) {
    if (cacheKey.includes(marker)) {
      delete require.cache[cacheKey];
    }
  }
}

async function createAgentsHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arca-m3-test-'));
  const dbPath = path.join(tmpDir, 'agents.db');

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
  const { closeDatabase } = require('../../db/client');
  const AgentsRepository = require('../../modules/agents/repository');
  const LLMAdapter = require('../../modules/agents/llm-adapter');
  const AgentTaskService = require('../../modules/agents/task.service');
  const agentsRoutes = require('../../api/agents.routes');
  const llmRoutes = require('../../api/llm.routes');

  migrate();

  const repository = new AgentsRepository();
  const llmAdapter = new LLMAdapter(repository);
  const service = new AgentTaskService(repository, llmAdapter);

  function createResponse() {
    return {
      statusCode: 200,
      body: undefined,
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
      }
    };
  }

  async function invoke(handler, req = {}) {
    const res = createResponse();
    let nextError = null;

    try {
      await handler(req, res, (error) => {
        nextError = error || null;
      });
    } catch (error) {
      nextError = error;
    }

    if (nextError) {
      return { error: nextError, res };
    }

    return { error: null, res };
  }

  async function waitForTask(taskId, targetStatus = 'done', timeoutMs = 2000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const task = service.getTask(taskId);
      if (task && task.status === targetStatus) {
        return task;
      }
      if (task && task.status === 'failed' && targetStatus !== 'failed') {
        return task;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Task ${taskId} did not reach ${targetStatus}`);
  }

  return {
    service,
    repository,
    agentsRoutes,
    llmRoutes,
    invoke,
    waitForTask,
    async close() {
      closeDatabase();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  };
}

module.exports = {
  createAgentsHarness
};
