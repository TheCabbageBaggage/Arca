const SepaRepository = require('./repository');
const SepaService = require('./service');

const repository = new SepaRepository();
const sepaService = new SepaService(repository);

module.exports = {
  SepaRepository,
  SepaService,
  repository,
  sepaService
};