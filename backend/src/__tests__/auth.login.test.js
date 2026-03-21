const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuthHarness } = require('./helpers/auth-harness');

test('login succeeds with valid credentials and returns a bearer token', async () => {
  const harness = await createAuthHarness();

  try {
    const result = harness.authService.login('admin@example.com', 'correct-horse-battery-staple');

    assert.equal(result.token_type, 'Bearer');
    assert.equal(typeof result.access_token, 'string');
    assert.equal(result.user.username, 'admin@example.com');
    assert.equal(result.user.role, 'admin');
  } finally {
    await harness.close();
  }
});

test('login fails with invalid credentials', async () => {
  const harness = await createAuthHarness();

  try {
    assert.throws(
      () => harness.authService.login('admin@example.com', 'wrong-password'),
      (error) => {
        assert.equal(error.statusCode, 401);
        assert.equal(error.message, 'Invalid credentials');
        return true;
      }
    );
  } finally {
    await harness.close();
  }
});
