const test = require('node:test');
const assert = require('node:assert/strict');
const { createM6Harness, m6RoutesAvailable } = require('./helpers/m6-harness');

const suite = m6RoutesAvailable ? test : test.skip;

function buildActor() {
  return {
    id: 'u_admin',
    name: 'Admin User',
    authType: 'jwt',
    scopes: [
      'projects:read',
      'projects:write',
      'tokens:read'
    ]
  };
}

function unwrap(body, keys) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) {
      return body[key];
    }
  }

  return body;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickNumber(body, keys) {
  for (const key of keys) {
    if (body && body[key] !== undefined && body[key] !== null) {
      const value = toNumber(body[key]);
      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}

async function createProjectFixture(harness, actor) {
  const result = await harness.invoke(harness.projectsHandlers.createProject, {
    body: {
      name: 'Apollo Portal',
      code: 'APOLLO',
      methodology: 'scrum',
      status: 'planned',
      token_budget: 250000,
      client_contact_id: 1,
      start_date: '2026-03-01',
      end_date: '2026-03-14',
      notes: 'Created by the M6 contract test'
    },
    user: actor,
    auth: { user: actor }
  });

  assert.equal(result.error, null);
  assert.ok([200, 201].includes(result.res.statusCode));

  const project = unwrap(result.res.body, ['project']);
  assert.ok(project);
  assert.equal(project.name, 'Apollo Portal');
  assert.equal(project.code, 'APOLLO');
  assert.equal(project.token_budget, 250000);
  assert.match(String(project.project_no), /^PRJ-/);
  assert.ok(project.id);

  return project;
}

async function createSprintFixture(harness, actor, project) {
  const result = await harness.invoke(harness.projectsHandlers.createSprint, {
    params: { id: String(project.id) },
    body: {
      name: 'Sprint 1',
      goal: 'Foundation work',
      status: 'active',
      start_date: '2026-03-01',
      end_date: '2026-03-14',
      budget_tokens: 500000,
      token_budget: 500000,
      budget_usd: 275.5,
      warn_threshold: 0.8,
      hard_limit: 1
    },
    user: actor,
    auth: { user: actor }
  });

  assert.equal(result.error, null);
  assert.ok([200, 201].includes(result.res.statusCode));

  const sprint = unwrap(result.res.body, ['sprint']);
  assert.ok(sprint);
  assert.equal(Number(sprint.project_id), Number(project.id));
  assert.equal(sprint.name, 'Sprint 1');
  assert.match(String(sprint.sprint_no), /^SPR-/);

  const budgetRow = harness.db.prepare(
    'SELECT * FROM sprint_token_budgets WHERE sprint_id = ?'
  ).get(sprint.id);
  assert.ok(budgetRow);
  assert.equal(budgetRow.budget_tokens, 500000);
  assert.equal(Number(budgetRow.warn_threshold), 0.8);
  assert.equal(budgetRow.hard_limit, 1);

  return sprint;
}

async function createStoryFixture(harness, actor, project, sprint) {
  const result = await harness.invoke(harness.projectsHandlers.createUserStory, {
    body: {
      project_id: project.id,
      sprint_id: sprint.id,
      title: 'Add token forecast panel',
      description: 'As a planner, I want a deterministic forecast for active sprints.',
      acceptance_criteria: [
        'Forecast includes active sprints',
        'Forecast returns the same payload on repeated calls',
        'Forecast exposes budget and consumption totals'
      ],
      acceptance_criteria_json: JSON.stringify([
        'Forecast includes active sprints',
        'Forecast returns the same payload on repeated calls',
        'Forecast exposes budget and consumption totals'
      ]),
      priority: 2,
      status: 'backlog'
    },
    user: actor,
    auth: { user: actor }
  });

  assert.equal(result.error, null);
  assert.ok([200, 201].includes(result.res.statusCode));

  const story = unwrap(result.res.body, ['story', 'user_story']);
  assert.ok(story);
  assert.equal(Number(story.project_id), Number(project.id));
  assert.equal(Number(story.sprint_id), Number(sprint.id));
  assert.equal(story.title, 'Add token forecast panel');
  assert.match(String(story.story_no), /^US-/);

  return story;
}

suite('projects: create and list projects', async () => {
  const harness = await createM6Harness();

  try {
    assert.ok(harness.hasProjectsRoutes, 'projects routes must be available for this test');

    const actor = buildActor();
    const project = await createProjectFixture(harness, actor);

    const list = await harness.invoke(harness.projectsHandlers.listProjects, {
      query: {},
      user: actor,
      auth: { user: actor }
    });

    assert.equal(list.error, null);
    assert.equal(list.res.statusCode, 200);

    const projects = unwrap(list.res.body, ['projects']);
    assert.ok(Array.isArray(projects));
    assert.ok(projects.some((row) => Number(row.id) === Number(project.id)));
  } finally {
    await harness.close();
  }
});

suite('projects: create sprint with token budget', async () => {
  const harness = await createM6Harness();

  try {
    assert.ok(harness.hasProjectsRoutes, 'projects routes must be available for this test');

    const actor = buildActor();
    const project = await createProjectFixture(harness, actor);
    const sprint = await createSprintFixture(harness, actor, project);

    const sprintsList = await harness.invoke(harness.projectsHandlers.listProjectSprints, {
      params: { id: String(project.id) },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(sprintsList.error, null);
    assert.equal(sprintsList.res.statusCode, 200);
    const sprints = unwrap(sprintsList.res.body, ['sprints']);
    assert.ok(Array.isArray(sprints));
    assert.ok(sprints.some((row) => Number(row.id) === Number(sprint.id)));
  } finally {
    await harness.close();
  }
});

suite('projects: create story and estimate tokens', async () => {
  const harness = await createM6Harness();

  try {
    assert.ok(harness.hasProjectsRoutes, 'projects routes must be available for this test');

    const actor = buildActor();
    const project = await createProjectFixture(harness, actor);
    const sprint = await createSprintFixture(harness, actor, project);
    const story = await createStoryFixture(harness, actor, project, sprint);

    const estimate = await harness.invoke(harness.projectsHandlers.estimateUserStoryTokens, {
      params: { id: String(story.id) },
      body: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514'
      },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(estimate.error, null);
    assert.ok([200, 201].includes(estimate.res.statusCode));

    const payload = unwrap(estimate.res.body, ['estimate', 'story_token_estimate']);
    const estimateTokens = pickNumber(payload, ['estimate_tokens', 'estimated_tokens', 'tokens']);
    assert.ok(estimateTokens !== null);
    assert.ok(estimateTokens > 0);

    const row = harness.db.prepare(
      'SELECT * FROM story_token_estimates WHERE story_id = ? ORDER BY id DESC LIMIT 1'
    ).get(story.id);
    assert.ok(row);
    assert.equal(row.estimate_tokens, estimateTokens);
  } finally {
    await harness.close();
  }
});

suite('projects: update story status', async () => {
  const harness = await createM6Harness();

  try {
    assert.ok(harness.hasProjectsRoutes, 'projects routes must be available for this test');

    const actor = buildActor();
    const project = await createProjectFixture(harness, actor);
    const sprint = await createSprintFixture(harness, actor, project);
    const story = await createStoryFixture(harness, actor, project, sprint);

    const updated = await harness.invoke(harness.projectsHandlers.updateUserStoryStatus, {
      params: { id: String(story.id) },
      body: { status: 'in_progress' },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(updated.error, null);
    assert.equal(updated.res.statusCode, 200);

    const payload = unwrap(updated.res.body, ['story', 'user_story']);
    assert.ok(payload);
    assert.equal(payload.status, 'in_progress');

    const dbRow = harness.db.prepare('SELECT status FROM user_stories WHERE id = ?').get(story.id);
    assert.equal(dbRow.status, 'in_progress');
  } finally {
    await harness.close();
  }
});

suite('projects: burndown endpoint returns events', async () => {
  const harness = await createM6Harness();

  try {
    assert.ok(harness.hasProjectsRoutes, 'projects routes must be available for this test');

    const actor = buildActor();
    const project = await createProjectFixture(harness, actor);
    const sprint = await createSprintFixture(harness, actor, project);
    const story = await createStoryFixture(harness, actor, project, sprint);
    const estimate = harness.db.prepare(
      `INSERT INTO story_token_estimates (
        story_id, estimate_tokens, model, provider, confidence, rationale, created_by_type, created_by_id, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      story.id,
      120,
      'claude-sonnet-4-20250514',
      'anthropic',
      1,
      'seeded estimate for burndown test',
      'human',
      actor.id,
      actor.name
    );

    assert.ok(estimate.changes > 0);

    harness.insertBurndownEvent({
      sprintId: sprint.id,
      storyId: story.id,
      eventType: 'consumed',
      consumedTokens: 120,
      remainingTokens: 380,
      note: 'Initial consumption'
    });

    const result = await harness.invoke(harness.projectsHandlers.getSprintBurndown, {
      params: { id: String(sprint.id) },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(result.error, null);
    assert.equal(result.res.statusCode, 200);

    const events = unwrap(result.res.body, ['events', 'burndown', 'data']);
    assert.ok(Array.isArray(events));
    assert.ok(events.length >= 1);

    const seeded = events.find((event) => Number(event.consumed_tokens) === 120);
    assert.ok(seeded);
    assert.equal(Number(seeded.remaining_tokens), 380);
  } finally {
    await harness.close();
  }
});

suite('tokens: budget endpoint reports consumed and remaining', async () => {
  const harness = await createM6Harness();

  try {
    assert.ok(harness.hasTokensRoutes, 'tokens routes must be available for this test');

    const actor = buildActor();
    const project = await createProjectFixture(harness, actor);
    const sprint = await createSprintFixture(harness, actor, project);

    harness.insertBurndownEvent({
      sprintId: sprint.id,
      eventType: 'planned',
      consumedTokens: 0,
      remainingTokens: 500000,
      note: 'Sprint planning'
    });
    harness.insertBurndownEvent({
      sprintId: sprint.id,
      eventType: 'consumed',
      consumedTokens: 150,
      remainingTokens: 499850,
      note: 'Implementation work'
    });

    const result = await harness.invoke(harness.tokensHandlers.getSprintTokenBudget, {
      params: { sprintId: String(sprint.id) },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(result.error, null);
    assert.equal(result.res.statusCode, 200);

    const payload = unwrap(result.res.body, ['budget', 'token_budget', 'sprint_budget']);
    const budgetTokens = pickNumber(payload, ['budget_tokens', 'token_budget']);
    const consumedTokens = pickNumber(payload, ['consumed_tokens', 'consumed']);
    const remainingTokens = pickNumber(payload, ['remaining_tokens', 'remaining']);

    assert.equal(budgetTokens, 500000);
    assert.ok(consumedTokens !== null);
    assert.ok(remainingTokens !== null);
    assert.ok(consumedTokens > 0);
    assert.ok(remainingTokens >= 0);
    assert.equal(consumedTokens + remainingTokens, budgetTokens);
  } finally {
    await harness.close();
  }
});

suite('tokens: cost forecast endpoint is deterministic', async () => {
  const harness = await createM6Harness();

  try {
    assert.ok(harness.hasTokensRoutes, 'tokens routes must be available for this test');

    const actor = buildActor();
    const project = await createProjectFixture(harness, actor);
    const sprint = await createSprintFixture(harness, actor, project);
    await createStoryFixture(harness, actor, project, sprint);
    harness.insertBurndownEvent({
      sprintId: sprint.id,
      eventType: 'consumed',
      consumedTokens: 120,
      remainingTokens: 380,
      note: 'Forecast seed'
    });

    const first = await harness.invoke(harness.tokensHandlers.getTokenCostForecast, {
      query: {},
      user: actor,
      auth: { user: actor }
    });
    const second = await harness.invoke(harness.tokensHandlers.getTokenCostForecast, {
      query: {},
      user: actor,
      auth: { user: actor }
    });

    assert.equal(first.error, null);
    assert.equal(second.error, null);
    assert.equal(first.res.statusCode, 200);
    assert.equal(second.res.statusCode, 200);

    const firstPayload = unwrap(first.res.body, ['forecast', 'cost_forecast', 'data']);
    const secondPayload = unwrap(second.res.body, ['forecast', 'cost_forecast', 'data']);
    assert.deepEqual(firstPayload, secondPayload);

    const serialized = JSON.stringify(firstPayload);
    assert.ok(serialized && serialized.length > 2);
  } finally {
    await harness.close();
  }
});
