const { buildCompletion } = require('../provider-utils');

async function complete(prompt, options = {}) {
  return buildCompletion('groq', prompt, options);
}

module.exports = {
  complete
};
