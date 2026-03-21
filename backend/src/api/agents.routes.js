const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { agentTaskService } = require('../modules/agents');

const router = express.Router();

function parseLimit(value) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function createStructuredTask(req, res, next) {
  try {
    if (!req.body || !req.body.instruction) {
      const error = new Error('Instruction is required');
      error.statusCode = 400;
      throw error;
    }

    const task = agentTaskService.createTask(req.body, req.user || req.auth?.user || null);
    res.status(202).json({
      task_id: task.task_id,
      status: task.status,
      task_type: task.task_type
    });
  } catch (error) {
    next(error);
  }
}

async function createNaturalLanguageTask(req, res, next) {
  try {
    if (!req.body || !req.body.instruction) {
      const error = new Error('Instruction is required');
      error.statusCode = 400;
      throw error;
    }

    const task = agentTaskService.createNaturalLanguageTask(req.body, req.user || req.auth?.user || null);
    res.status(202).json({
      task_id: task.task_id,
      status: task.status,
      task_type: task.task_type
    });
  } catch (error) {
    next(error);
  }
}

async function getTask(req, res, next) {
  try {
    const task = agentTaskService.getTask(req.params.id);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
}

async function listTasks(req, res, next) {
  try {
    const tasks = agentTaskService.listTasks({
      status: req.query.status,
      taskType: req.query.task_type || req.query.taskType,
      limit: parseLimit(req.query.limit)
    });

    const filtered = typeof req.query.limit === 'undefined' ? tasks : tasks.slice(0, parseLimit(req.query.limit) || tasks.length);
    res.status(200).json({ tasks: filtered });
  } catch (error) {
    next(error);
  }
}

router.post('/tasks', authenticate, requireScopes('agents:write'), createStructuredTask);
router.post('/nl', authenticate, requireScopes('agents:write'), createNaturalLanguageTask);
router.get('/tasks', authenticate, requireScopes('agents:read'), listTasks);
router.get('/tasks/:id', authenticate, requireScopes('agents:read'), getTask);

router.handlers = {
  createStructuredTask,
  createNaturalLanguageTask,
  getTask,
  listTasks
};

module.exports = router;
