const { ensureProjectsSchema } = require('./schema');
const {
  buildCode,
  currentYear,
  defaultSprintBudgetTokens,
  normalizeDate,
  parseJson,
  toJson,
  toNumber,
  warnThreshold
} = require('./utils');

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function mapProject(row, metrics = {}) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    project_no: row.project_no,
    name: row.name,
    code: row.code,
    client_contact_id: row.client_contact_id,
    status: row.status,
    methodology: row.methodology,
    start_date: row.start_date,
    end_date: row.end_date,
    token_budget: row.token_budget,
    notes: row.notes,
    nextcloud_path: row.nextcloud_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...metrics
  };
}

function mapSprint(row, extra = {}) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    sprint_no: row.sprint_no,
    project_id: row.project_id,
    name: row.name,
    goal: row.goal,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    velocity_tokens: row.velocity_tokens,
    committed_tokens: row.committed_tokens,
    consumed_tokens: row.consumed_tokens,
    remaining_tokens: row.remaining_tokens,
    nextcloud_path: row.nextcloud_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...extra
  };
}

function mapStory(row, extra = {}) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    story_no: row.story_no,
    project_id: row.project_id,
    sprint_id: row.sprint_id,
    title: row.title,
    description: row.description,
    acceptance_criteria: parseJson(row.acceptance_criteria_json, []),
    acceptance_criteria_json: row.acceptance_criteria_json,
    status: row.status,
    priority: row.priority,
    estimated_tokens: row.estimated_tokens,
    actual_tokens: row.actual_tokens,
    nextcloud_path: row.nextcloud_path,
    created_by_type: row.created_by_type,
    created_by_id: row.created_by_id,
    created_by_name: row.created_by_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...extra
  };
}

class ProjectsRepository {
  ensure() {
    return ensureProjectsSchema();
  }

  contactExists(contactId) {
    const db = this.ensure();
    const row = db.prepare('SELECT id FROM contacts WHERE id = ? LIMIT 1').get(Number(contactId));
    return Boolean(row);
  }

  getProjectById(id) {
    const db = this.ensure();
    const row = db.prepare('SELECT * FROM projects WHERE id = ? LIMIT 1').get(Number(id));
    return row ? mapProject(row, this.getProjectMetrics(db, row.id)) : null;
  }

  getProjectMetrics(db, projectId) {
    const sprint = db.prepare(
      `SELECT
         COUNT(*) AS sprint_count,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_sprints,
         COALESCE(SUM(committed_tokens), 0) AS committed_tokens,
         COALESCE(SUM(consumed_tokens), 0) AS consumed_tokens,
         COALESCE(SUM(remaining_tokens), 0) AS remaining_tokens
       FROM sprints
       WHERE project_id = ?`
    ).get(Number(projectId));

    const story = db.prepare(
      `SELECT
         COUNT(*) AS story_count,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_stories,
         COALESCE(SUM(estimated_tokens), 0) AS estimated_tokens,
         COALESCE(SUM(actual_tokens), 0) AS actual_tokens
       FROM user_stories
       WHERE project_id = ?`
    ).get(Number(projectId));

    return {
      sprint_count: Number(sprint?.sprint_count || 0),
      active_sprints: Number(sprint?.active_sprints || 0),
      committed_tokens: Number(sprint?.committed_tokens || 0),
      consumed_tokens: Number(sprint?.consumed_tokens || 0),
      remaining_tokens: Number(sprint?.remaining_tokens || 0),
      story_count: Number(story?.story_count || 0),
      done_stories: Number(story?.done_stories || 0),
      estimated_tokens: Number(story?.estimated_tokens || 0),
      actual_tokens: Number(story?.actual_tokens || 0)
    };
  }

  nextProjectNo(db, year) {
    const row = db.prepare(
      `SELECT MAX(CAST(substr(project_no, 10) AS INTEGER)) AS max_number
       FROM projects
       WHERE project_no LIKE ?`
    ).get(`PRJ-${year}-%`);

    return buildCode('PRJ', Number(row?.max_number || 0) + 1, 3, year);
  }

  createProject(record = {}) {
    const db = this.ensure();
    const name = String(record.name || '').trim();

    if (!name) {
      throw badRequest('name is required');
    }

    const startDate = record.start_date ? normalizeDate(record.start_date) : null;
    const endDate = record.end_date ? normalizeDate(record.end_date) : null;

    if (record.start_date && !startDate) {
      throw badRequest('start_date is invalid');
    }

    if (record.end_date && !endDate) {
      throw badRequest('end_date is invalid');
    }

    if (startDate && endDate && endDate < startDate) {
      throw badRequest('end_date cannot be before start_date');
    }

    const year = currentYear(startDate || new Date());
    const projectNo = record.project_no || this.nextProjectNo(db, year);
    const tokenBudget = Math.max(0, toNumber(record.token_budget, 0));

    if (record.client_contact_id && !this.contactExists(record.client_contact_id)) {
      throw notFound('Contact not found');
    }

    const insert = db.prepare(
      `INSERT INTO projects (
        project_no,
        name,
        code,
        client_contact_id,
        status,
        methodology,
        start_date,
        end_date,
        token_budget,
        notes,
        nextcloud_path,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    );

    const info = insert.run(
      projectNo,
      name,
      record.code || null,
      record.client_contact_id ? Number(record.client_contact_id) : null,
      record.status || 'active',
      record.methodology || 'scrum',
      startDate,
      endDate,
      tokenBudget,
      record.notes || null,
      record.nextcloud_path || null
    );

    return this.getProjectById(info.lastInsertRowid);
  }

  listProjects() {
    const db = this.ensure();
    const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC, id DESC').all();
    return rows.map((row) => mapProject(row, this.getProjectMetrics(db, row.id)));
  }

  getSprintById(id) {
    const db = this.ensure();
    const row = db.prepare('SELECT * FROM sprints WHERE id = ? LIMIT 1').get(Number(id));
    return row ? mapSprint(row, { budget: this.getSprintBudgetStatus(id) }) : null;
  }

  listSprints(projectId) {
    const db = this.ensure();
    const rows = db
      .prepare('SELECT * FROM sprints WHERE project_id = ? ORDER BY start_date DESC, id DESC')
      .all(Number(projectId));

    return rows.map((row) => mapSprint(row, { budget: this.getSprintBudgetStatus(row.id) }));
  }

  listStories(projectId, sprintId = null) {
    const db = this.ensure();
    const baseSql = `SELECT * FROM user_stories WHERE project_id = ?`;

    const rows = sprintId
      ? db
        .prepare(`${baseSql} AND sprint_id = ? ORDER BY created_at DESC, id DESC`)
        .all(Number(projectId), Number(sprintId))
      : db
        .prepare(`${baseSql} ORDER BY created_at DESC, id DESC`)
        .all(Number(projectId));

    return rows.map((row) => mapStory(row));
  }

  nextSprintNo(db, year) {
    const row = db.prepare(
      `SELECT MAX(CAST(substr(sprint_no, 10) AS INTEGER)) AS max_number
       FROM sprints
       WHERE sprint_no LIKE ?`
    ).get(`SPR-${year}-%`);

    return buildCode('SPR', Number(row?.max_number || 0) + 1, 3, year);
  }

  createSprint(projectId, record = {}, actor = null) {
    const db = this.ensure();
    const project = db.prepare('SELECT * FROM projects WHERE id = ? LIMIT 1').get(Number(projectId));

    if (!project) {
      throw notFound('Project not found');
    }

    const name = String(record.name || '').trim();
    if (!name) {
      throw badRequest('name is required');
    }

    const startDate = record.start_date ? normalizeDate(record.start_date) : null;
    const endDate = record.end_date ? normalizeDate(record.end_date) : null;

    if (record.start_date && !startDate) {
      throw badRequest('start_date is invalid');
    }

    if (record.end_date && !endDate) {
      throw badRequest('end_date is invalid');
    }

    if (startDate && endDate && endDate < startDate) {
      throw badRequest('end_date cannot be before start_date');
    }

    const year = currentYear(startDate || project.start_date || new Date());
    const sprintNo = record.sprint_no || this.nextSprintNo(db, year);
    const budgetTokens = Math.max(
      0,
      toNumber(record.budget_tokens ?? record.token_budget, defaultSprintBudgetTokens())
    );
    const warn = toNumber(record.warn_threshold, warnThreshold());
    const normalizedWarn = Math.min(1, Math.max(0, warn));
    const hardLimit = toNumber(record.hard_limit, 0) > 0 ? 1 : 0;

    const actorType = actor?.authType || actor?.type || 'system';
    const actorId = actor?.id ? String(actor.id) : 'system';
    const actorName = actor?.name || actor?.username || 'system';

    const tx = db.transaction(() => {
      const sprintInsert = db.prepare(
        `INSERT INTO sprints (
          sprint_no,
          project_id,
          name,
          goal,
          status,
          start_date,
          end_date,
          velocity_tokens,
          committed_tokens,
          consumed_tokens,
          remaining_tokens,
          nextcloud_path,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      );

      const sprintInfo = sprintInsert.run(
        sprintNo,
        Number(projectId),
        name,
        record.goal || null,
        record.status || 'planned',
        startDate,
        endDate,
        budgetTokens,
        budgetTokens,
        0,
        budgetTokens,
        record.nextcloud_path || null
      );

      const sprintId = sprintInfo.lastInsertRowid;

      db.prepare(
        `INSERT INTO sprint_token_budgets (
          sprint_id,
          budget_tokens,
          budget_usd,
          warn_threshold,
          hard_limit,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).run(
        sprintId,
        budgetTokens,
        record.budget_usd !== undefined ? Number(record.budget_usd) : null,
        normalizedWarn,
        hardLimit
      );

      db.prepare(
        `INSERT INTO sprint_burndown_events (
          sprint_id,
          story_id,
          event_type,
          consumed_tokens,
          remaining_tokens,
          note,
          recorded_by_type,
          recorded_by_id,
          recorded_by_name,
          recorded_at
        ) VALUES (?, NULL, 'planned', 0, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).run(
        sprintId,
        budgetTokens,
        record.note || 'Sprint planned',
        actorType,
        actorId,
        actorName
      );

      return sprintId;
    });

    const sprintId = tx();
    return this.getSprintById(sprintId);
  }

  nextStoryNo(db, year) {
    const row = db.prepare(
      `SELECT MAX(CAST(substr(story_no, 9) AS INTEGER)) AS max_number
       FROM user_stories
       WHERE story_no LIKE ?`
    ).get(`US-${year}-%`);

    return buildCode('US', Number(row?.max_number || 0) + 1, 3, year);
  }

  getStoryById(id) {
    const db = this.ensure();
    const row = db.prepare('SELECT * FROM user_stories WHERE id = ? LIMIT 1').get(Number(id));
    return row ? mapStory(row) : null;
  }

  createStory(record = {}) {
    const db = this.ensure();
    const projectId = Number(record.project_id);
    const project = db.prepare('SELECT * FROM projects WHERE id = ? LIMIT 1').get(projectId);

    if (!project) {
      throw notFound('Project not found');
    }

    const sprintId = record.sprint_id ? Number(record.sprint_id) : null;
    if (sprintId) {
      const sprint = db
        .prepare('SELECT id, project_id FROM sprints WHERE id = ? LIMIT 1')
        .get(sprintId);

      if (!sprint || Number(sprint.project_id) !== projectId) {
        throw badRequest('sprint_id is invalid for this project');
      }
    }

    const title = String(record.title || '').trim();
    if (!title) {
      throw badRequest('title is required');
    }

    const description = String(record.description || '').trim();
    if (!description) {
      throw badRequest('description is required');
    }

    const accepted = Array.isArray(record.acceptance_criteria)
      ? record.acceptance_criteria
      : parseJson(record.acceptance_criteria_json, []);

    const year = currentYear(new Date());
    const storyNo = record.story_no || this.nextStoryNo(db, year);

    const info = db.prepare(
      `INSERT INTO user_stories (
        story_no,
        project_id,
        sprint_id,
        title,
        description,
        acceptance_criteria_json,
        status,
        priority,
        estimated_tokens,
        actual_tokens,
        nextcloud_path,
        created_by_type,
        created_by_id,
        created_by_name,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).run(
      storyNo,
      projectId,
      sprintId,
      title,
      description,
      toJson(accepted, '[]'),
      record.status || 'backlog',
      Math.min(5, Math.max(1, toNumber(record.priority, 3))),
      Math.max(0, toNumber(record.estimated_tokens ?? record.estimate_tokens, 0)),
      Math.max(0, toNumber(record.actual_tokens, 0)),
      record.nextcloud_path || null,
      record.created_by_type || null,
      record.created_by_id || null,
      record.created_by_name || null
    );

    return this.getStoryById(info.lastInsertRowid);
  }

  updateUserStoryStatus(id, changes = {}) {
    const db = this.ensure();
    const story = db.prepare('SELECT * FROM user_stories WHERE id = ? LIMIT 1').get(Number(id));

    if (!story) {
      return null;
    }

    const status = String(changes.status || '').trim();
    if (!status) {
      throw badRequest('status is required');
    }

    const sprintId = changes.sprint_id ? Number(changes.sprint_id) : null;
    if (sprintId) {
      const sprint = db.prepare('SELECT id FROM sprints WHERE id = ? LIMIT 1').get(sprintId);
      if (!sprint) {
        throw badRequest('sprint_id not found');
      }
    }

    const actualTokens = changes.actual_tokens !== undefined
      ? Math.max(0, toNumber(changes.actual_tokens, 0))
      : story.actual_tokens;

    db.prepare(
      `UPDATE user_stories
       SET status = ?,
           sprint_id = ?,
           actual_tokens = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      status,
      sprintId === null ? story.sprint_id : sprintId,
      actualTokens,
      Number(id)
    );

    return this.getStoryById(id);
  }

  estimateUserStory(id, input = {}) {
    const db = this.ensure();
    const story = db.prepare('SELECT * FROM user_stories WHERE id = ? LIMIT 1').get(Number(id));

    if (!story) {
      return null;
    }

    const estimateTokens = Math.max(0, toNumber(input.estimate_tokens ?? input.tokens, 0));

    const info = db.prepare(
      `INSERT INTO story_token_estimates (
        story_id,
        estimate_tokens,
        model,
        provider,
        confidence,
        rationale,
        created_by_type,
        created_by_id,
        created_by_name,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(
      story.id,
      estimateTokens,
      input.model || null,
      input.provider || null,
      Math.min(1, Math.max(0, toNumber(input.confidence, 0))),
      input.rationale || input.note || null,
      input.created_by_type || null,
      input.created_by_id || null,
      input.created_by_name || null
    );

    db.prepare(
      `UPDATE user_stories
       SET estimated_tokens = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(estimateTokens, story.id);

    return db.prepare('SELECT * FROM story_token_estimates WHERE id = ?').get(info.lastInsertRowid);
  }

  getSprintBurndown(sprintId) {
    const db = this.ensure();
    const sprint = db.prepare('SELECT * FROM sprints WHERE id = ? LIMIT 1').get(Number(sprintId));
    if (!sprint) {
      return null;
    }

    const events = db.prepare(
      `SELECT
         id,
         sprint_id,
         story_id,
         event_type,
         consumed_tokens,
         remaining_tokens,
         note,
         recorded_by_type,
         recorded_by_id,
         recorded_by_name,
         recorded_at
       FROM sprint_burndown_events
       WHERE sprint_id = ?
       ORDER BY recorded_at ASC, id ASC`
    ).all(Number(sprintId));

    return events;
  }

  getTokenUsageSummary(filters = {}) {
    const db = this.ensure();
    const where = [];
    const params = [];

    if (filters.provider) {
      where.push('provider_name = ?');
      params.push(String(filters.provider));
    }

    if (filters.from) {
      where.push('date(recorded_at) >= date(?)');
      params.push(String(filters.from));
    }

    if (filters.to) {
      where.push('date(recorded_at) <= date(?)');
      params.push(String(filters.to));
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const byProvider = db.prepare(
      `SELECT
         provider_name,
         model,
         COUNT(*) AS usage_count,
         COALESCE(SUM(input_tokens), 0) AS input_tokens,
         COALESCE(SUM(output_tokens), 0) AS output_tokens,
         COALESCE(SUM(total_tokens), 0) AS total_tokens,
         COALESCE(SUM(cost_usd), 0) AS cost_usd
       FROM token_usage
       ${whereSql}
       GROUP BY provider_name, model
       ORDER BY total_tokens DESC, provider_name ASC, model ASC`
    ).all(...params);

    const totals = db.prepare(
      `SELECT
         COALESCE(SUM(input_tokens), 0) AS input_tokens,
         COALESCE(SUM(output_tokens), 0) AS output_tokens,
         COALESCE(SUM(total_tokens), 0) AS total_tokens,
         COALESCE(SUM(cost_usd), 0) AS cost_usd
       FROM token_usage
       ${whereSql}`
    ).get(...params);

    return {
      filters,
      by_provider: byProvider,
      totals: {
        input_tokens: Number(totals?.input_tokens || 0),
        output_tokens: Number(totals?.output_tokens || 0),
        total_tokens: Number(totals?.total_tokens || 0),
        cost_usd: Number(totals?.cost_usd || 0)
      }
    };
  }

  getSprintBudgetStatus(sprintId) {
    const db = this.ensure();
    const sprint = db.prepare('SELECT * FROM sprints WHERE id = ? LIMIT 1').get(Number(sprintId));

    if (!sprint) {
      return null;
    }

    const budget = db.prepare(
      'SELECT * FROM sprint_token_budgets WHERE sprint_id = ? LIMIT 1'
    ).get(Number(sprintId));

    const consumedRow = db.prepare(
      `SELECT COALESCE(SUM(consumed_tokens), 0) AS consumed_tokens
       FROM sprint_burndown_events
       WHERE sprint_id = ? AND event_type = 'consumed'`
    ).get(Number(sprintId));

    const latestRemaining = db.prepare(
      `SELECT remaining_tokens
       FROM sprint_burndown_events
       WHERE sprint_id = ?
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1`
    ).get(Number(sprintId));

    const budgetTokens = Number(budget?.budget_tokens ?? sprint.committed_tokens ?? 0);
    const consumedTokens = Number(consumedRow?.consumed_tokens || 0);
    const fallbackRemaining = Math.max(0, budgetTokens - consumedTokens);
    const remainingTokens = Number(latestRemaining?.remaining_tokens ?? fallbackRemaining);

    return {
      sprint_id: Number(sprintId),
      sprint_no: sprint.sprint_no,
      sprint_name: sprint.name,
      status: sprint.status,
      budget_tokens: budgetTokens,
      consumed_tokens: consumedTokens,
      remaining_tokens: remainingTokens,
      warn_threshold: Number(budget?.warn_threshold ?? warnThreshold()),
      hard_limit: Number(budget?.hard_limit ?? 0),
      budget_usd: budget?.budget_usd === null || budget?.budget_usd === undefined
        ? null
        : Number(budget.budget_usd)
    };
  }

  getCostForecast() {
    const db = this.ensure();

    const avgCost = db.prepare(
      `SELECT
         COALESCE(SUM(cost_usd), 0) AS cost_usd,
         COALESCE(SUM(total_tokens), 0) AS total_tokens
       FROM token_usage`
    ).get();

    const observedTokens = Number(avgCost?.total_tokens || 0);
    const observedCost = Number(avgCost?.cost_usd || 0);
    const defaultCostPerToken = 0.000003;
    const costPerToken = observedTokens > 0 ? observedCost / observedTokens : defaultCostPerToken;

    const sprints = db.prepare(
      `SELECT s.id, s.project_id, s.sprint_no, s.name, s.status, p.project_no, p.name AS project_name
       FROM sprints s
       INNER JOIN projects p ON p.id = s.project_id
       WHERE s.status IN ('planned', 'active', 'review')
       ORDER BY s.id ASC`
    ).all();

    const items = sprints.map((row) => {
      const budget = this.getSprintBudgetStatus(row.id);
      const projectedTotalCost = Number((budget.budget_tokens * costPerToken).toFixed(6));
      const projectedRemainingCost = Number((budget.remaining_tokens * costPerToken).toFixed(6));

      return {
        sprint_id: row.id,
        sprint_no: row.sprint_no,
        sprint_name: row.name,
        sprint_status: row.status,
        project_id: row.project_id,
        project_no: row.project_no,
        project_name: row.project_name,
        budget_tokens: budget.budget_tokens,
        consumed_tokens: budget.consumed_tokens,
        remaining_tokens: budget.remaining_tokens,
        projected_total_cost_usd: projectedTotalCost,
        projected_remaining_cost_usd: projectedRemainingCost
      };
    });

    const totals = items.reduce(
      (acc, item) => {
        acc.budget_tokens += item.budget_tokens;
        acc.consumed_tokens += item.consumed_tokens;
        acc.remaining_tokens += item.remaining_tokens;
        acc.projected_total_cost_usd += item.projected_total_cost_usd;
        acc.projected_remaining_cost_usd += item.projected_remaining_cost_usd;
        return acc;
      },
      {
        sprint_count: items.length,
        budget_tokens: 0,
        consumed_tokens: 0,
        remaining_tokens: 0,
        projected_total_cost_usd: 0,
        projected_remaining_cost_usd: 0,
        cost_per_1k_tokens_usd: Number((costPerToken * 1000).toFixed(6))
      }
    );

    totals.projected_total_cost_usd = Number(totals.projected_total_cost_usd.toFixed(6));
    totals.projected_remaining_cost_usd = Number(totals.projected_remaining_cost_usd.toFixed(6));

    return {
      active_sprints: items,
      totals
    };
  }
}

module.exports = ProjectsRepository;
