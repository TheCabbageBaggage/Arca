const crypto = require('crypto');
const AgentsRepository = require('./repository');
const LLMAdapter = require('./llm-adapter');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AgentTaskService {
  constructor(repository = new AgentsRepository(), llmAdapter = null) {
    this.repository = repository;
    this.llmAdapter = llmAdapter || new LLMAdapter(this.repository);
    this.scheduled = new Map();
  }

  createTask(payload, actor = null) {
    const task = this.repository.createTask({
      taskType: payload.task_type || payload.taskType || 'general',
      instruction: payload.instruction,
      contextJson: JSON.stringify(payload.context || {}),
      llmOverrideJson: payload.llm_override ? JSON.stringify(payload.llm_override) : null,
      createdByType: actor?.authType || actor?.type || 'system',
      createdById: actor?.id ? String(actor.id) : null,
      createdByName: actor?.name || actor?.username || 'system'
    });

    this.schedule(task.task_id);
    return task;
  }

  createNaturalLanguageTask(payload, actor = null) {
    return this.createTask({
      task_type: 'natural_language',
      instruction: payload.instruction,
      context: payload.context || {},
      llm_override: payload.llm_override || null
    }, actor);
  }

  getTask(taskId) {
    return this.repository.getTaskById(taskId);
  }

  listTasks(filters = {}) {
    return this.repository.listTasks(filters);
  }

  listProviders() {
    return this.repository.listProviders().map((provider) => ({
      name: provider.name,
      base_url: provider.base_url,
      api_key_env: provider.api_key_env,
      default_model: provider.default_model,
      is_active: Boolean(provider.is_active),
      is_local: Boolean(provider.is_local),
      routing_priority: provider.routing_priority
    }));
  }

  createRoutingRule(rule) {
    const normalized = {
      priority: Number(rule.priority || 10),
      condition_field: rule.condition_field,
      condition_op: rule.condition_op,
      condition_value: String(rule.condition_value),
      provider_name: rule.provider_name,
      model: rule.model || null
    };

    return this.repository.createRoutingRule(normalized);
  }

  async testProvider(providerName, payload = {}) {
    const provider = this.repository.getProvider(providerName);
    if (!provider || !provider.is_active) {
      const error = new Error(`Provider not found: ${providerName}`);
      error.statusCode = 404;
      throw error;
    }

    const result = await this.llmAdapter.complete(payload.prompt || `test:${providerName}`, {
      provider: providerName,
      model: payload.model || provider.default_model,
      taskType: 'provider_test'
    });

    return {
      provider: providerName,
      model: result.model,
      ok: true,
      content: result.content,
      usage: result.usage,
      cost_usd: result.cost_usd,
      latency_ms: result.latency_ms
    };
  }

  schedule(taskId) {
    if (this.scheduled.has(taskId)) {
      return;
    }

    const handle = setImmediate(() => {
      this.scheduled.delete(taskId);
      this.processTask(taskId).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to process task', taskId, error);
      });
    });

    this.scheduled.set(taskId, handle);
  }

  async processTask(taskId) {
    const task = this.repository.getTaskById(taskId);
    if (!task) {
      return null;
    }

    if (task.status !== 'queued') {
      return task;
    }

    this.repository.updateTask(taskId, {
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await sleep(10);

    try {
      const override = task.llm_override || {};
      const prompt = this.buildPrompt(task);
      const startedAt = Date.now();
      const completion = await this.llmAdapter.complete(prompt, {
        provider: override.provider,
        model: override.model,
        confidential: Boolean(task.context?.confidential),
        taskType: task.task_type
      });
      const latencyMs = Date.now() - startedAt;

      this.repository.incrementTaskUsage(taskId, {
        provider: completion.provider,
        model: completion.model,
        input_tokens: completion.usage.input_tokens,
        output_tokens: completion.usage.output_tokens,
        cost_usd: completion.cost_usd,
        latency_ms: latencyMs,
        task_type: task.task_type
      });

      const result = {
        summary: completion.content,
        task_type: task.task_type,
        provider: completion.provider,
        model: completion.model,
        usage: completion.usage,
        cost_usd: completion.cost_usd
      };

      return this.repository.updateTask(taskId, {
        status: 'done',
        provider: completion.provider,
        model: completion.model,
        result_json: JSON.stringify(result),
        input_tokens: completion.usage.input_tokens,
        output_tokens: completion.usage.output_tokens,
        total_tokens: completion.usage.input_tokens + completion.usage.output_tokens,
        cost_usd: completion.cost_usd,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      return this.repository.updateTask(taskId, {
        status: 'failed',
        error_message: error.message,
        error_code: error.statusCode ? String(error.statusCode) : 'TASK_FAILED',
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  buildPrompt(task) {
    return [
      `Task type: ${task.task_type}`,
      `Instruction: ${task.instruction}`,
      `Context: ${JSON.stringify(task.context || {})}`
    ].join('\n');
  }
}

module.exports = AgentTaskService;
