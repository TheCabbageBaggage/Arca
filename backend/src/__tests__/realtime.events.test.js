const test = require('node:test');
const assert = require('node:assert/strict');
const { createAgentsHarness } = require('./helpers/agents-harness');

test('realtime bus publishes contract envelope', async () => {
  const { subscribe, publishEvent } = require('../realtime/bus');
  const received = [];
  const unsubscribe = subscribe((event) => {
    received.push(event);
  });

  try {
    publishEvent('contract.test', { hello: 'world' });
    assert.equal(received.length, 1);
    assert.equal(received[0].type, 'contract.test');
    assert.equal(received[0].payload.hello, 'world');
    assert.ok(received[0].timestamp);
  } finally {
    unsubscribe();
  }
});

test('agent task lifecycle emits realtime events', async () => {
  const harness = await createAgentsHarness();
  const { subscribe } = require('../realtime/bus');
  const received = [];
  const unsubscribe = subscribe((event) => {
    if (String(event.type || '').startsWith('agent.task')) {
      received.push(event);
    }
  });

  try {
    const actor = { id: 'u_admin', name: 'Admin User', authType: 'jwt' };
    const created = harness.service.createTask({
      task_type: 'architecture',
      instruction: 'Emit realtime events'
    }, actor);

    await harness.waitForTask(created.task_id, 'done');

    const eventTypes = received.map((event) => event.type);
    assert.ok(eventTypes.includes('agent.task.created'));
    assert.ok(eventTypes.includes('agent.task.updated'));
  } finally {
    unsubscribe();
    await harness.close();
  }
});
