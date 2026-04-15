const FxRepository = require("./repository");
const FxService = require("./service");

const repository = new FxRepository();
const fxService = new FxService(repository);

module.exports = { FxRepository, FxService, repository, fxService };
