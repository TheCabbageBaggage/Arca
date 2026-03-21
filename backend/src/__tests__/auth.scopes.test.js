const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuthHarness } = require('./helpers/auth-harness');

test('scope middleware denies requests that are missing a required scope', async () => {
  const harness = await createAuthHarness();

  try {
    const login = harness.authService.login('user@example.com', 'letmein');
    const auth = harness.authService.authenticateBearer(login.access_token);

    const requireScopes = harness.authMiddleware.requireScopes('finance:write');
    const req = {
      auth,
      user: auth.user,
      headers: {}
    };

    const error = await harness.runMiddleware(requireScopes, req);

    assert.equal(error.statusCode, 403);
    assert.match(error.message, /Missing required scope/);
  } finally {
    await harness.close();
  }
});
