const InventoryRepository = require('./repository');
const InventoryService = require('./service');

const repository = new InventoryRepository();
const inventoryService = new InventoryService(repository);

module.exports = { InventoryRepository, InventoryService, repository, inventoryService };
