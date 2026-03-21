const { buildCompletion } = require('../provider-utils');

async function complete(prompt, options = {}) {
  return buildCompletion('openai', prompt, options);
}

module.exports = {
  complete
};
