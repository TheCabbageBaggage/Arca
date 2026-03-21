const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { projectsService } = require('../modules/projects');

const router = express.Router();

async function listProjects(req, res, next) {
  try {
    const projects = projectsService.listProjects();
    res.status(200).json({ projects });
  } catch (error) {
    next(error);
  }
}

async function createProject(req, res, next) {
  try {
    const project = projectsService.createProject(req.body || {});
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
}

async function listProjectSprints(req, res, next) {
  try {
    const sprints = projectsService.listSprints(req.params.id);
    res.status(200).json({ sprints });
  } catch (error) {
    next(error);
  }
}

async function createSprint(req, res, next) {
  try {
    const sprint = projectsService.createSprint(req.params.id, req.body || {}, req.user || req.auth?.user || null);
    res.status(201).json({ sprint });
  } catch (error) {
    next(error);
  }
}

async function getSprintBurndown(req, res, next) {
  try {
    const events = projectsService.getBurndown(req.params.id);
    res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
}

async function createUserStory(req, res, next) {
  try {
    const story = projectsService.createUserStory(req.body || {}, req.user || req.auth?.user || null);
    res.status(201).json({ story });
  } catch (error) {
    next(error);
  }
}

async function updateUserStoryStatus(req, res, next) {
  try {
    const story = projectsService.updateUserStoryStatus(req.params.id, req.body || {});
    res.status(200).json({ story });
  } catch (error) {
    next(error);
  }
}

async function estimateUserStoryTokens(req, res, next) {
  try {
    const estimate = projectsService.estimateUserStory(req.params.id, req.body || {}, req.user || req.auth?.user || null);
    res.status(201).json({ estimate });
  } catch (error) {
    next(error);
  }
}

router.get('/projects', authenticate, requireScopes('projects:read'), listProjects);
router.post('/projects', authenticate, requireScopes('projects:write'), createProject);
router.get('/projects/:id/sprints', authenticate, requireScopes('projects:read'), listProjectSprints);
router.post('/projects/:id/sprints', authenticate, requireScopes('projects:write'), createSprint);
router.get('/sprints/:id/burndown', authenticate, requireScopes('projects:read'), getSprintBurndown);
router.post('/user-stories', authenticate, requireScopes('projects:write'), createUserStory);
router.patch('/user-stories/:id/status', authenticate, requireScopes('projects:write'), updateUserStoryStatus);
router.post('/user-stories/:id/estimate', authenticate, requireScopes('projects:write'), estimateUserStoryTokens);

router.handlers = {
  listProjects,
  createProject,
  listProjectSprints,
  createSprint,
  getSprintBurndown,
  createUserStory,
  updateUserStoryStatus,
  estimateUserStoryTokens
};

module.exports = router;
