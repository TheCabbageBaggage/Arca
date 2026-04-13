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

test('approval flow resumes waiting tasks when approved', async () => {
  const harness = await createAgentsHarness();

  try {
    const actor = { id: 'ak_cfo_01', keyId: 'ak_cfo_01', name: 'CFO Agent', authType: 'agent_key' };
    const created = harness.service.createTask({
      task_type: 'finance_posting',
      instruction: 'Post supplier payment #20034',
      approval_required: true,
      approval_scope: 'finance:write',
      approval_amount_usd: 1250,
      approval_reason: 'Invoice V-20034'
    }, actor);

    assert.equal(created.status, 'waiting_approval');

    const approved = harness.service.approveTask(created.task_id, { approved: true, reason: 'Verified against PO' }, actor);
    assert.equal(approved.status, 'queued');
    assert.equal(approved.approved_by, 'ak_cfo_01');
    assert.ok(approved.approved_at);

    const completed = await harness.waitForTask(created.task_id, 'done');
    assert.equal(completed.status, 'done');
  } finally {
    await harness.close();
  }
});

test('approval flow cancels task when rejected', async () => {
  const harness = await createAgentsHarness();

  try {
    const actor = { id: 'ak_cfo_01', keyId: 'ak_cfo_01', name: 'CFO Agent', authType: 'agent_key' };
    const created = harness.service.createTask({
      task_type: 'finance_posting',
      instruction: 'Post supplier payment #20035',
      approval_required: true
    }, actor);

    assert.equal(created.status, 'waiting_approval');

    const rejected = harness.service.approveTask(created.task_id, { approved: false, reason: 'Missing supporting doc' }, actor);
    assert.equal(rejected.status, 'cancelled');
    assert.match(rejected.error_message, /Approval rejected/);
  } finally {
    await harness.close();
  }
});

test('approve route surfaces 404 for missing tasks', async () => {
  const harness = await createAgentsHarness();

  try {
    const result = await harness.invoke(harness.agentsRoutes.handlers.approveTask, {
      params: { id: 'task_missing' },
      body: { approved: true },
      user: { id: 'ak_cfo_01', keyId: 'ak_cfo_01', authType: 'agent_key' },
      auth: { user: { id: 'ak_cfo_01', keyId: 'ak_cfo_01', authType: 'agent_key' } }
    });

    assert.equal(result.error.statusCode, 404);
    assert.equal(result.error.message, 'Task not found');
  } finally {
    await harness.close();
  }
});
