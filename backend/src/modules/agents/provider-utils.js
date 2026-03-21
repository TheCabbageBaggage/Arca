function estimateTokens(text) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}

function buildUsage(prompt, outputText) {
  const input_tokens = estimateTokens(prompt);
  const output_tokens = estimateTokens(outputText);

  return { input_tokens, output_tokens };
}

function buildCompletion(providerName, prompt, options = {}) {
  const model = options.model || 'default';
  const promptText = String(prompt || '').trim();
  const taskType = options.taskType || 'general';
  const content = `${providerName}:${model}:${taskType}:${promptText.slice(0, 120)}`;
  const usage = buildUsage(promptText, content);

  return {
    content,
    usage
  };
}

module.exports = {
  estimateTokens,
  buildUsage,
  buildCompletion
};
