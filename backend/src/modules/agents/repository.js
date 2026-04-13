const crypto = require('crypto');
const { openDatabase } = require('../../db/client');
const { ensureAgentSchema } = require('./schema');

function parseJson(raw, fallback = null) {
  if (raw === null || raw === undefined || raw === '') {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

class AgentsRepository {
  ensure() {
    return ensureAgentSchema();
  }

  createTask(task) {
    const db = this.ensure();
    const taskId = task.taskId || `task_${crypto.randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO agent_tasks (
        task_id, agent_type, task_type, status, instruction, request_payload,
        provider_name, model, result_payload, error_text, input_tokens,
        output_tokens, total_tokens, cost_usd, created_by_type, created_by_id,
        created_by_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 0, 0, 0, 0, ?, ?, ?, ?, ?)`
    ).run(
      taskId,
      task.agentType || 'generic',
      task.taskType,
      task.status || 'queued',
      task.instruction,
      JSON.stringify({
        context: parseJson(task.contextJson, {}),
        llm_override: parseJson(task.llmOverrideJson, null),
        approval: parseJson(task.approvalJson, null)
      }),
      task.createdByType || null,
      task.createdById || null,
      task.createdByName || null,
      now,
      now
    );

    return this.getTaskById(taskId);
  }

  updateTask(taskId, changes) {
    const db = this.ensure();
    const fields = [];
    const values = [];

    const map = {
      status: 'status',
      provider: 'provider_name',
      model: 'model',
      result_json: 'result_payload',
      error_message: 'error_text',
      approved_by: 'approved_by',
      approved_at: 'approved_at',
      input_tokens: 'input_tokens',
      output_tokens: 'output_tokens',
      total_tokens: 'total_tokens',
      cost_usd: 'cost_usd',
      started_at: 'started_at',
      finished_at: 'completed_at',
      updated_at: 'updated_at'
    };

    for (const [key, column] of Object.entries(map)) {
      if (changes[key] !== undefined) {
        fields.push(`${column} = ?`);
        values.push(changes[key]);
      }
    }

    if (fields.length === 0) {
      return this.getTaskById(taskId);
    }

    values.push(taskId);
    db.prepare(`UPDATE agent_tasks SET ${fields.join(', ')} WHERE task_id = ?`).run(...values);
    return this.getTaskById(taskId);
  }

  incrementTaskUsage(taskId, usage) {
    const db = this.ensure();
    db.prepare(
      `INSERT INTO token_usage (
        task_id, provider_name, model, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, task_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      taskId,
      usage.provider,
      usage.model,
      usage.input_tokens || 0,
      usage.output_tokens || 0,
      (usage.input_tokens || 0) + (usage.output_tokens || 0),
      usage.cost_usd || 0,
      usage.latency_ms || null,
      usage.task_type || null
    );
  }

  listTasks(filters = {}) {
    const db = this.ensure();
    const clauses = [];
    const values = [];

    if (filters.status) {
      clauses.push('status = ?');
      values.push(filters.status);
    }

    if (filters.taskType) {
      clauses.push('task_type = ?');
      values.push(filters.taskType);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(`SELECT * FROM agent_tasks ${where} ORDER BY id DESC`).all(...values);
    return rows.map((row) => this.mapTask(row));
  }

  getTaskById(taskId) {
    const db = this.ensure();
    const row = db.prepare('SELECT * FROM agent_tasks WHERE task_id = ? LIMIT 1').get(taskId);
    return row ? this.mapTask(row) : null;
  }

  listProviders() {
    const db = this.ensure();
    return db.prepare('SELECT * FROM llm_providers WHERE is_active = 1 ORDER BY routing_priority ASC, name ASC').all();
  }

  getProvider(name) {
    const db = this.ensure();
    return db.prepare('SELECT * FROM llm_providers WHERE name = ? LIMIT 1').get(name) || null;
  }

  listRoutingRules() {
    const db = this.ensure();
    return db.prepare('SELECT * FROM llm_routing_rules WHERE is_active = 1 ORDER BY priority ASC, id ASC').all();
  }

  createRoutingRule(rule) {
    const db = this.ensure();
    const stmt = db.prepare(
      `INSERT INTO llm_routing_rules (
        priority, condition_field, condition_op, condition_value, provider_name, model, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, 1)`
    );

    const info = stmt.run(
      rule.priority,
      rule.condition_field,
      rule.condition_op,
      rule.condition_value,
      rule.provider_name,
      rule.model || null
    );

    return this.getRoutingRuleById(info.lastInsertRowid);
  }

  getRoutingRuleById(id) {
    const db = this.ensure();
    return db.prepare('SELECT * FROM llm_routing_rules WHERE id = ? LIMIT 1').get(id) || null;
  }

  mapTask(row) {
    const requestPayload = parseJson(row.request_payload, {});

    return {
      id: row.id,
      task_id: row.task_id,
      task_type: row.task_type,
      instruction: row.instruction,
      context: requestPayload.context || {},
      llm_override: requestPayload.llm_override || null,
      approval: requestPayload.approval || null,
      status: row.status,
      provider: row.provider_name,
      model: row.model,
      result: parseJson(row.result_payload, null),
      error_message: row.error_text,
      error_code: null,
      approved_by: row.approved_by || null,
      approved_at: row.approved_at || null,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      total_tokens: row.total_tokens,
      cost_usd: row.cost_usd,
      queued_at: row.created_at,
      started_at: row.started_at,
      finished_at: row.completed_at,
      created_by: {
        type: row.created_by_type,
        id: row.created_by_id,
        name: row.created_by_name
      },
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

module.exports = AgentsRepository;
