const DocumentsRepository = require('./repository');
const DocumentsService = require('./documents.service');
const { NextcloudClient } = require('./nextcloud.client');

const repository = new DocumentsRepository();
const nextcloudClient = new NextcloudClient();
const documentsService = new DocumentsService({ repository, nextcloudClient });

module.exports = {
  DocumentsRepository,
  DocumentsService,
  NextcloudClient,
  repository,
  nextcloudClient,
  documentsService
};
