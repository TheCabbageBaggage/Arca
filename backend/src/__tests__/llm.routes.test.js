const test = require('node:test');
const assert = require('node:assert/strict');
const { createAgentsHarness } = require('./helpers/agents-harness');

test('llm providers route lists seeded providers', async () => {
  const harness = await createAgentsHarness();

  try {
    const result = await harness.invoke(harness.llmRoutes.handlers.listProviders, {
      user: { id: 'u_admin' },
      auth: { user: { id: 'u_admin' } }
    });

    assert.equal(result.res.statusCode, 200);
    assert.ok(Array.isArray(result.res.body.providers));
    assert.ok(result.res.body.providers.some((provider) => provider.name === 'anthropic'));
  } finally {
    await harness.close();
  }
});

test('llm routing rule creation persists a rule', async () => {
  const harness = await createAgentsHarness();

  try {
    const result = await harness.invoke(harness.llmRoutes.handlers.updateRoutingRules, {
      body: {
        priority: 1,
        condition_field: 'task_type',
        condition_op: '=',
        condition_value: 'architecture',
        provider_name: 'anthropic',
        model: 'claude-sonnet-4-20250514'
      },
      user: { id: 'u_admin' },
      auth: { user: { id: 'u_admin' } }
    });

    assert.equal(result.res.statusCode, 201);
    assert.equal(result.res.body.rule.provider_name, 'anthropic');
    assert.equal(result.res.body.rule.condition_value, 'architecture');
  } finally {
    await harness.close();
  }
});

test('llm provider test succeeds and missing provider returns 404', async () => {
  const harness = await createAgentsHarness();

  try {
    const ok = await harness.invoke(harness.llmRoutes.handlers.testProvider, {
      params: { provider: 'ollama' },
      body: { prompt: 'ping', model: 'llama3.1' },
      user: { id: 'u_admin' },
      auth: { user: { id: 'u_admin' } }
    });

    assert.equal(ok.res.statusCode, 200);
    assert.equal(ok.res.body.ok, true);
    assert.equal(ok.res.body.provider, 'ollama');

    const missing = await harness.invoke(harness.llmRoutes.handlers.testProvider, {
      params: { provider: 'unknown' },
      body: {},
      user: { id: 'u_admin' },
      auth: { user: { id: 'u_admin' } }
    });

    assert.equal(missing.error.statusCode, 404);
    assert.match(missing.error.message, /Provider not found/);
  } finally {
    await harness.close();
  }
});
