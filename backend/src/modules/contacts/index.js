const ContactsRepository = require('./repository');
const ContactsService = require('./service');

const repository = new ContactsRepository();
const contactsService = new ContactsService(repository);

module.exports = {
  ContactsRepository,
  ContactsService,
  repository,
  contactsService
};
