const { openDatabase } = require('./src/db/client');
const { sepaService } = require('./src/modules/sepa');

const db = openDatabase();

console.log('=== Simple SEPA Test ===\n');

// Test 1: Validate IBAN and BIC
console.log('Test 1: IBAN/BIC Validation');
const ibanTest = sepaService.validateIBAN('AT611904300234573201');
const bicTest = sepaService.validateBIC('BKAUATWW');
console.log(`IBAN 'AT611904300234573201': ${ibanTest.valid ? '✓' : '✗'}`);
console.log(`BIC 'BKAUATWW': ${bicTest.valid ? '✓' : '✗'}\n`);

// Test 2: Generate message ID
console.log('Test 2: Message ID Generation');
const msgId = sepaService.generateMessageId();
console.log(`Generated Message ID: ${msgId}\n`);

// Test 3: Check if SEPA tables exist
console.log('Test 3: Database Structure');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%sepa%'").all();
console.log('SEPA tables found:', tables.map(t => t.name).join(', '));

const sepaFilesColumns = db.prepare("PRAGMA table_info(sepa_files)").all();
console.log(`sepa_files has ${sepaFilesColumns.length} columns\n`);

// Test 4: Test payment validation
console.log('Test 4: Payment Validation');
const testPayment = {
  id: 123,
  total_amount: 1000.50,
  currency: 'EUR',
  recipient_name: 'Test Supplier',
  recipient_iban: 'AT611904300234573201',
  recipient_bic: 'BKAUATWW',
  description: 'Test payment'
};

const paymentValidation = sepaService.validatePayment(testPayment);
console.log(`Payment validation: ${paymentValidation.valid ? '✓' : '✗'}`);
if (!paymentValidation.valid) {
  console.log('Errors:', paymentValidation.errors);
}
console.log('\n=== All Tests Completed ===');