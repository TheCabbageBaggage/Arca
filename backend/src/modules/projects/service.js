const ProjectsRepository = require('./repository');

function requireField(value, message) {
  if (value === undefined || value === null || String(value).trim() === '') {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
}

function actorOrSystem(actor) {
  return {
    type: actor?.authType || actor?.type || 'system',
    id: actor?.id ? String(actor.id) : 'system',
    name: actor?.name || actor?.username || 'system'
  };
}

function autoEstimateTokens(story, payload = {}) {
  if (payload.estimate_tokens !== undefined || payload.estimateTokens !== undefined || payload.tokens !== undefined) {
    const explicit = Number(payload.estimate_tokens ?? payload.estimateTokens ?? payload.tokens);
    if (Number.isFinite(explicit) && explicit > 0) {
      return Math.round(explicit);
    }
  }

  const criteria = Array.isArray(story.acceptance_criteria) ? story.acceptance_criteria.length : 0;
  const titleWeight = String(story.title || '').trim().length * 24;
  const descriptionWeight = String(story.description || '').trim().length * 10;
  const base = 1200;
  const estimated = base + titleWeight + descriptionWeight + (criteria * 1200);
  return Math.max(1000, Math.round(estimated));
}

class ProjectsService {
  constructor(repository = new ProjectsRepository()) {
    this.repository = repository;
  }

  listProjects() {
    return this.repository.listProjects();
  }

  createProject(payload = {}) {
    requireField(payload.name, 'name is required');
    return this.repository.createProject(payload);
  }

  listSprints(projectId) {
    return this.repository.listSprints(projectId);
  }

  createSprint(projectId, payload = {}, actor = null) {
    requireField(payload.name, 'name is required');
    return this.repository.createSprint(projectId, payload, actorOrSystem(actor));
  }

  getBurndown(sprintId) {
    const result = this.repository.getSprintBurndown(sprintId);
    if (!result) {
      const error = new Error('Sprint not found');
      error.statusCode = 404;
      throw error;
    }

    return result;
  }

  createUserStory(payload = {}, actor = null) {
    requireField(payload.project_id || payload.projectId, 'project_id is required');
    requireField(payload.title, 'title is required');
    requireField(payload.description, 'description is required');

    const createdBy = actorOrSystem(actor);

    return this.repository.createStory({
      project_id: payload.project_id || payload.projectId,
      sprint_id: payload.sprint_id || payload.sprintId || null,
      title: payload.title,
      description: payload.description,
      acceptance_criteria: payload.acceptance_criteria || payload.acceptanceCriteria || [],
      acceptance_criteria_json: payload.acceptance_criteria_json,
      status: payload.status || 'backlog',
      priority: payload.priority,
      estimated_tokens: payload.estimated_tokens || payload.estimate_tokens || payload.estimateTokens || 0,
      actual_tokens: payload.actual_tokens || payload.actualTokens || 0,
      nextcloud_path: payload.nextcloud_path || payload.nextcloudPath || null,
      created_by_type: createdBy.type,
      created_by_id: createdBy.id,
      created_by_name: createdBy.name
    });
  }

  updateUserStoryStatus(id, payload = {}) {
    requireField(payload.status, 'status is required');

    const story = this.repository.updateUserStoryStatus(id, {
      status: payload.status,
      sprint_id: payload.sprint_id || payload.sprintId,
      actual_tokens: payload.actual_tokens || payload.actualTokens
    });

    if (!story) {
      const error = new Error('User story not found');
      error.statusCode = 404;
      throw error;
    }

    return story;
  }

  estimateUserStory(id, payload = {}, actor = null) {
    const story = this.repository.getStoryById(id);
    if (!story) {
      const error = new Error('User story not found');
      error.statusCode = 404;
      throw error;
    }

    const createdBy = actorOrSystem(actor);
    const estimateTokens = autoEstimateTokens(story, payload);

    return this.repository.estimateUserStory(id, {
      estimate_tokens: estimateTokens,
      confidence: payload.confidence || payload.estimateConfidence || 0.72,
      provider: payload.provider || payload.estimateProvider || null,
      model: payload.model || payload.estimateModel || null,
      rationale: payload.rationale || payload.note || 'Auto-estimated from story metadata',
      created_by_type: createdBy.type,
      created_by_id: createdBy.id,
      created_by_name: createdBy.name
    });
  }
}

module.exports = ProjectsService;
