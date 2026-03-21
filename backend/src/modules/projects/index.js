const ProjectsRepository = require('./repository');
const ProjectsService = require('./service');

const repository = new ProjectsRepository();
const projectsService = new ProjectsService(repository);

module.exports = {
  ProjectsRepository,
  ProjectsService,
  repository,
  projectsService
};
