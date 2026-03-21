const { buildCompletion } = require('../provider-utils');

async function complete(prompt, options = {}) {
  return buildCompletion('lm-studio', prompt, options);
}

module.exports = {
  complete
};
