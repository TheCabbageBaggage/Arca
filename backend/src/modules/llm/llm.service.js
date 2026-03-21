const { openDatabase } = require('../../db/client');
const LLMAdapter = require('../agents/llm-adapter');

function tableExists(db, name) {
  try {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(name);
    return Boolean(row);
  } catch {
    return false;
  }
}

function normalizeRule(rule, index = 0) {
  return {
    priority: Number(rule.priority ?? index + 1),
    condition_field: rule.condition_field || rule.conditionField || 'task_type',
    condition_op: rule.condition_op || rule.conditionOp || '=',
    condition_value: String(rule.condition_value ?? rule.conditionValue ?? 'default'),
    provider_name: rule.provider_name || rule.providerName || 'anthropic',
    model: rule.model || null,
    is_active: Number(rule.is_active ?? rule.isActive ?? 1)
  };
}

class LLMService {
  constructor(options = {}) {
    this.adapter = options.adapter || new LLMAdapter();
  }

  listProviders() {
    const db = openDatabase();
    const catalog = new Map(this.adapter.listProviders().map((provider) => [provider.name, provider]));

    if (!tableExists(db, 'llm_providers')) {
      return Array.from(catalog.values());
    }

    const rows = db.prepare('SELECT * FROM llm_providers ORDER BY routing_priority ASC, name ASC').all();

    if (!rows.length) {
      return Array.from(catalog.values());
    }

    return rows.map((row) => {
      const fallback = catalog.get(row.name) || {};
      return {
        name: row.name,
        label: fallback.label || row.name,
        base_url: row.base_url || fallback.default_base_url || null,
        api_key_env: row.api_key_env || null,
        default_model: row.default_model || fallback.default_model || null,
        is_active: row.is_active === 1 || row.is_active === true,
        is_local: row.is_local === 1 || row.is_local === true,
        routing_priority: row.routing_priority,
        available: Boolean(fallback.available),
        source: 'db'
      };
    });
  }

  listRoutingRules() {
    const db = openDatabase();
    if (!tableExists(db, 'llm_routing_rules')) {
      return [];
    }

    return db.prepare('SELECT * FROM llm_routing_rules ORDER BY priority ASC, id ASC').all().map((row) => ({
      id: row.id,
      priority: row.priority,
      condition_field: row.condition_field,
      condition_op: row.condition_op,
      condition_value: row.condition_value,
      provider_name: row.provider_name,
      model: row.model,
      is_active: row.is_active === 1 || row.is_active === true
    }));
  }

  updateRoutingRules(rules = []) {
    const db = openDatabase();
    const normalizedRules = Array.isArray(rules) ? rules.map(normalizeRule) : [];

    if (!tableExists(db, 'llm_routing_rules')) {
      return {
        persisted: false,
        rules: normalizedRules
      };
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM llm_routing_rules').run();
      const insert = db.prepare(
        `INSERT INTO llm_routing_rules (
          priority, condition_field, condition_op, condition_value, provider_name, model, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      for (const rule of normalizedRules) {
        insert.run(
          rule.priority,
          rule.condition_field,
          rule.condition_op,
          rule.condition_value,
          rule.provider_name,
          rule.model,
          rule.is_active
        );
      }
    });

    tx();

    return {
      persisted: true,
      rules: this.listRoutingRules()
    };
  }

  testProvider(providerName, options = {}) {
    return this.adapter.testProvider(providerName, options);
  }

  complete(prompt, options = {}) {
    return this.adapter.complete(prompt, options);
  }
}

module.exports = LLMService;
module.exports.tableExists = tableExists;
module.exports.normalizeRule = normalizeRule;
