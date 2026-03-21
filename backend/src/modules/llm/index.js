const LLMAdapter = require('../agents/llm-adapter');
const LLMService = require('./llm.service');

module.exports = {
  LLMAdapter,
  LLMService,
  createLLMService(options = {}) {
    return new LLMService(options);
  }
};
