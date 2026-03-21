const { buildCompletion } = require('../provider-utils');

async function complete(prompt, options = {}) {
  return buildCompletion('anthropic', prompt, options);
}

module.exports = {
  complete
};
