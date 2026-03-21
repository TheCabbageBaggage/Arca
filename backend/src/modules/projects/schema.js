const { openDatabase } = require('../../db/client');
const { tableExists } = require('./utils');

function ensureProjectsSchema() {
  const db = openDatabase();
  const requiredTables = [
    'projects',
    'sprints',
    'sprint_token_budgets',
    'user_stories',
    'story_token_estimates',
    'sprint_burndown_events',
    'token_usage'
  ];
  const missing = requiredTables.filter((name) => !tableExists(db, name));

  if (missing.length > 0) {
    const error = new Error(`Missing M6 tables: ${missing.join(', ')}. Run the M6 migration before using project/tokens modules.`);
    error.statusCode = 500;
    throw error;
  }

  return db;
}

module.exports = {
  ensureProjectsSchema
};
