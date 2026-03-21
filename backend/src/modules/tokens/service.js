const ProjectsRepository = require('../projects/repository');

class TokensService {
  constructor(repository = new ProjectsRepository()) {
    this.repository = repository;
  }

  getUsage(filters = {}) {
    return this.repository.getTokenUsageSummary(filters);
  }

  getBudget(sprintId) {
    const budget = this.repository.getSprintBudgetStatus(sprintId);
    if (!budget) {
      const error = new Error('Sprint not found');
      error.statusCode = 404;
      throw error;
    }

    return budget;
  }

  getCostForecast() {
    return this.repository.getCostForecast();
  }
}

module.exports = TokensService;
