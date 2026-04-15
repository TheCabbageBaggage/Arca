const ApprovalsRepository = require("./repository");
const ApprovalsService = require("./service");

const repository = new ApprovalsRepository();
const approvalsService = new ApprovalsService(repository);

module.exports = { ApprovalsRepository, ApprovalsService, repository, approvalsService };
