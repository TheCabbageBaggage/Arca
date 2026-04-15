const ReportsRepository = require('./repository');
const ReportsService = require('./service');

const reportsRepository = new ReportsRepository();
const reportsService = new ReportsService(reportsRepository);

module.exports = {
  ReportsRepository,
  ReportsService,
  reportsRepository,
  reportsService
};
