const AgentsRepository = require('./repository');
const LLMAdapter = require('./llm-adapter');
const AgentTaskService = require('./task.service');

const repository = new AgentsRepository();
const llmAdapter = new LLMAdapter(repository);
const agentTaskService = new AgentTaskService(repository, llmAdapter);

module.exports = {
  AgentsRepository,
  LLMAdapter,
  AgentTaskService,
  repository,
  llmAdapter,
  agentTaskService
};
