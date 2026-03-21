const test = require('node:test');
const assert = require('node:assert/strict');
const { createAgentsHarness } = require('./helpers/agents-harness');

test('agent task lifecycle moves from queued to done', async () => {
  const harness = await createAgentsHarness();

  try {
    const actor = { id: 'u_admin', name: 'Admin User', authType: 'jwt' };
    const created = harness.service.createTask({
      task_type: 'architecture',
      instruction: 'Draft a module plan for the ERP dashboard.',
      context: { confidential: false }
    }, actor);

    assert.equal(created.status, 'queued');
    assert.match(created.task_id, /^task_/);

    const completed = await harness.waitForTask(created.task_id);
    assert.equal(completed.status, 'done');
    assert.equal(completed.provider, 'anthropic');
    assert.ok(completed.result);
    assert.match(completed.result.summary, /Task type: architecture/);

    const fetched = harness.service.getTask(created.task_id);
    assert.equal(fetched.status, 'done');
    assert.equal(fetched.result.provider, 'anthropic');

    const listed = harness.service.listTasks({ status: 'done' });
    assert.ok(listed.some((task) => task.task_id === created.task_id));
  } finally {
    await harness.close();
  }
});

test('agent task lookup returns null for missing tasks', async () => {
  const harness = await createAgentsHarness();

  try {
    assert.equal(harness.service.getTask('task_missing'), null);
  } finally {
    await harness.close();
  }
});

test('agent routes surface 404 for missing tasks', async () => {
  const harness = await createAgentsHarness();

  try {
    const result = await harness.invoke(harness.agentsRoutes.handlers.getTask, {
      params: { id: 'task_missing' },
      user: { id: 'u_admin' },
      auth: { user: { id: 'u_admin' } }
    });

    assert.equal(result.error.statusCode, 404);
    assert.equal(result.error.message, 'Task not found');
  } finally {
    await harness.close();
  }
});
