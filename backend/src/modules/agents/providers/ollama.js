const { buildCompletion } = require('../provider-utils');

async function complete(prompt, options = {}) {
  return buildCompletion('ollama', prompt, options);
}

module.exports = {
  complete
};
