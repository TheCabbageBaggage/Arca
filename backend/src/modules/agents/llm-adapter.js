const providers = {
  anthropic: require('./providers/anthropic'),
  openai: require('./providers/openai'),
  groq: require('./providers/groq'),
  ollama: require('./providers/ollama'),
  lm_studio: require('./providers/lm-studio')
};

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

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

class LLMAdapter {
  constructor(repository) {
    this.repository = repository;
  }

  resolveProvider(options = {}) {
    if (options.provider) {
      return options.provider;
    }

    if (options.confidential) {
      return getEnv('LLM_CONFIDENTIAL_PROVIDER', 'ollama');
    }

    const routeMap = {
      architecture: 'anthropic',
      code_review: 'anthropic',
      data_entry: 'groq',
      bulk_ops: 'ollama'
    };

    if (options.taskType && routeMap[options.taskType]) {
      return routeMap[options.taskType];
    }

    return getEnv('LLM_DEFAULT_PROVIDER', 'anthropic');
  }

  resolveModel(providerName, options = {}) {
    if (options.model) {
      return options.model;
    }

    if (options.taskType === 'bulk_ops' && providerName === 'ollama') {
      return getEnv('LLM_FALLBACK_MODEL', 'llama3.1');
    }

    const provider = this.repository.getProvider(providerName);
    if (provider && provider.default_model) {
      return provider.default_model;
    }

    return getEnv('LLM_DEFAULT_MODEL', 'claude-sonnet-4-20250514');
  }

  calculateCost(providerName, model, usage) {
    const priceTable = {
      'anthropic/claude-opus-4': { in: 15.0, out: 75.0 },
      'anthropic/claude-sonnet-4': { in: 3.0, out: 15.0 },
      'openai/gpt-4o': { in: 2.5, out: 10.0 },
      'groq/llama3-70b-8192': { in: 0.07, out: 0.08 },
      'ollama/*': { in: 0, out: 0 },
      'lm_studio/*': { in: 0, out: 0 }
    };

    const key = `${providerName}/${model}`;
    const price = priceTable[key] || priceTable[`${providerName}/*`] || { in: 0, out: 0 };
    return ((usage.input_tokens * price.in) + (usage.output_tokens * price.out)) / 1000000;
  }

  async complete(prompt, options = {}) {
    const providerName = this.resolveProvider(options);
    const provider = providers[providerName];
    if (!provider) {
      const error = new Error(`Unsupported provider: ${providerName}`);
      error.statusCode = 404;
      throw error;
    }

    const model = this.resolveModel(providerName, options);
    const start = Date.now();
    const result = await provider.complete(prompt, {
      model,
      taskType: options.taskType,
      confidential: Boolean(options.confidential)
    });
    const latencyMs = Date.now() - start;
    const costUsd = this.calculateCost(providerName, model, result.usage);

    return {
      provider: providerName,
      model,
      content: result.content,
      usage: result.usage,
      cost_usd: costUsd,
      latency_ms: latencyMs
    };
  }
}

module.exports = LLMAdapter;
