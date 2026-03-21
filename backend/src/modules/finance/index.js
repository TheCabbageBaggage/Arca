const FinanceRepository = require('./repository');
const FinanceService = require('./service');

const repository = new FinanceRepository();
const financeService = new FinanceService(repository);

module.exports = {
  FinanceRepository,
  FinanceService,
  repository,
  financeService
};
