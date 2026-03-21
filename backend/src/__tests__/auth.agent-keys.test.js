const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuthHarness } = require('./helpers/auth-harness');

test('agent key creation is allowed for admin users', async () => {
  const harness = await createAuthHarness();

  try {
    const login = harness.authService.login('admin@example.com', 'correct-horse-battery-staple');
    const auth = harness.authService.authenticateBearer(login.access_token);

    const result = harness.authService.createAgentKey(auth.user, {
      name: 'Finance Agent',
      scopes: ['finance:write', 'contacts:read'],
      expires_at: null,
      preferred_llm_provider: 'ollama',
      preferred_llm_model: 'llama3.1',
      token_budget_per_day: 500000
    });

    assert.equal(result.name, 'Finance Agent');
    assert.equal(result.scopes.includes('finance:write'), true);
    assert.equal(typeof result.key, 'string');
    assert.equal(typeof result.key_id, 'string');
    assert.equal(typeof result.created_by, 'number');
  } finally {
    await harness.close();
  }
});

test('agent key creation is rejected for non-admin users', async () => {
  const harness = await createAuthHarness();

  try {
    const login = harness.authService.login('user@example.com', 'letmein');
    const auth = harness.authService.authenticateBearer(login.access_token);

    assert.throws(
      () =>
        harness.authService.createAgentKey(auth.user, {
          name: 'Restricted Agent',
          scopes: ['finance:write']
        }),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.message, 'Admin privileges required');
        return true;
      }
    );
  } finally {
    await harness.close();
  }
});
