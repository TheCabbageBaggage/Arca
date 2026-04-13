const crypto = require('crypto');
const AgentsRepository = require('./repository');
const LLMAdapter = require('./llm-adapter');
const { financeService } = require('../finance');
const { publishEvent } = require('../../realtime/bus');

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
    const approvalRequired = Boolean(payload.approval_required || payload.approvalRequired || payload.await_approval || payload.awaitApproval);
    const approval = approvalRequired
      ? {
          required: true,
          scope: payload.approval_scope || payload.approvalScope || 'finance:write',
          amount_usd: payload.approval_amount_usd || payload.approvalAmountUsd || null,
          reason: payload.approval_reason || payload.approvalReason || null
        }
      : null;

    const task = this.repository.createTask({
      taskType: payload.task_type || payload.taskType || 'general',
      instruction: payload.instruction,
      contextJson: JSON.stringify(payload.context || {}),
      llmOverrideJson: payload.llm_override ? JSON.stringify(payload.llm_override) : null,
      approvalJson: approval ? JSON.stringify(approval) : null,
      status: approvalRequired ? 'waiting_approval' : 'queued',
      createdByType: actor?.authType || actor?.type || 'system',
      createdById: actor?.id ? String(actor.id) : null,
      createdByName: actor?.name || actor?.username || 'system'
    });

    publishEvent('agent.task.created', {
      task_id: task.task_id,
      status: task.status,
      task_type: task.task_type,
      created_by: task.created_by
    });

    if (!approvalRequired) {
      this.schedule(task.task_id);
    }
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

  approveTask(taskId, payload = {}, actor = null) {
    const task = this.repository.getTaskById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    if (task.status !== 'waiting_approval') {
      const error = new Error('Task is not waiting for approval');
      error.statusCode = 409;
      throw error;
    }

    if (typeof payload.approved !== 'boolean') {
      const error = new Error('approved must be a boolean');
      error.statusCode = 400;
      throw error;
    }

    const approvedBy = actor?.keyId || actor?.id || actor?.username || actor?.name || 'unknown';
    const approvedAt = new Date().toISOString();

    if (!payload.approved) {
      const rejected = this.repository.updateTask(taskId, {
        status: 'cancelled',
        approved_by: String(approvedBy),
        approved_at: approvedAt,
        error_message: payload.reason ? `Approval rejected: ${payload.reason}` : 'Approval rejected',
        updated_at: approvedAt
      });
      publishEvent('agent.task.approval.rejected', {
        task_id: taskId,
        status: rejected.status,
        approved_by: rejected.approved_by,
        reason: payload.reason || null
      });
      return rejected;
    }

    const updated = this.repository.updateTask(taskId, {
      status: 'queued',
      approved_by: String(approvedBy),
      approved_at: approvedAt,
      updated_at: approvedAt
    });

    publishEvent('agent.task.approval.approved', {
      task_id: taskId,
      status: updated.status,
      approved_by: updated.approved_by,
      approved_at: updated.approved_at
    });

    this.schedule(taskId);
    return updated;
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

    if (task.status === 'waiting_approval') {
      return task;
    }

    if (task.status !== 'queued') {
      return task;
    }

    const running = this.repository.updateTask(taskId, {
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    publishEvent('agent.task.updated', {
      task_id: taskId,
      status: running.status,
      task_type: running.task_type
    });

    await sleep(10);

    try {
      const actionResult = this.executePendingAction(task);
      if (actionResult) {
        const now = new Date().toISOString();
        const completed = this.repository.updateTask(taskId, {
          status: 'done',
          provider: 'internal',
          model: 'finance-engine',
          result_json: JSON.stringify(actionResult),
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          cost_usd: 0,
          finished_at: now,
          updated_at: now
        });
        publishEvent('agent.task.updated', {
          task_id: taskId,
          status: completed.status,
          task_type: completed.task_type,
          provider: completed.provider
        });
        return completed;
      }

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

      const completed = this.repository.updateTask(taskId, {
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
      publishEvent('agent.task.updated', {
        task_id: taskId,
        status: completed.status,
        task_type: completed.task_type,
        provider: completed.provider
      });
      return completed;
    } catch (error) {
      const failed = this.repository.updateTask(taskId, {
        status: 'failed',
        error_message: error.message,
        error_code: error.statusCode ? String(error.statusCode) : 'TASK_FAILED',
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      publishEvent('agent.task.updated', {
        task_id: taskId,
        status: failed.status,
        task_type: failed.task_type,
        error: failed.error_message
      });
      return failed;
    }
  }

  executePendingAction(task) {
    const action = task?.context?.pending_action;
    if (!action || action.module !== 'finance') {
      return null;
    }

    const actor = {
      ...(task.context?.actor || {}),
      approvalGranted: true
    };

    if (action.action === 'create_invoice') {
      const invoice = financeService.createInvoice(action.payload || {}, actor);
      return {
        type: 'pending_action',
        module: 'finance',
        action: action.action,
        result: { invoice }
      };
    }

    if (action.action === 'create_payment') {
      const payment = financeService.createPayment(action.payload || {}, actor);
      return {
        type: 'pending_action',
        module: 'finance',
        action: action.action,
        result: { payment }
      };
    }

    if (action.action === 'create_journal_entry') {
      const journal_entry = financeService.createJournalEntry(action.payload || {}, actor);
      return {
        type: 'pending_action',
        module: 'finance',
        action: action.action,
        result: { journal_entry }
      };
    }

    const error = new Error(`Unsupported pending action: ${action.action}`);
    error.statusCode = 400;
    throw error;
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
