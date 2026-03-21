#!/usr/bin/env node

require('dotenv').config();

const { verifyChain } = require('./verify');
const { closeDatabase } = require('../../db/client');

function parseTableArg(argv) {
  const index = argv.findIndex((arg) => arg === '--table');
  if (index >= 0 && argv[index + 1]) {
    return argv[index + 1];
  }
  return 'transaction_log';
}

function run() {
  try {
    const args = process.argv.slice(2);
    const mode = args[0] || 'verify';

    if (mode === 'verify-system-log') {
      const result = verifyChain('system_log');
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    const table = parseTableArg(args);
    const result = verifyChain(table);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } finally {
    closeDatabase();
  }
}

run();
