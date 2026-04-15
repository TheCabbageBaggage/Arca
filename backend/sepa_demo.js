const { openDatabase } = require('./src/db/client');
const { sepaService } = require('./src/modules/sepa');

const db = openDatabase();

console.log('=== SEPA Credit Transfer Demo ===\n');

// 1. Create a test contact with bank details
console.log('1. Creating test contact with bank details...');
const contactStmt = db.prepare(`
  INSERT INTO contacts (contact_no, type, name, is_active, iban, bic) 
  VALUES (?, ?, ?, 1, ?, ?)
`);
const contactResult = contactStmt.run(
  `C-SEPA-TEST-${Date.now()}`,
  'creditor',
  'Demo Supplier GmbH',
  'DE89370400440532013000',
  'DEUTDEFF'
);
const contactId = contactResult.lastInsertRowid;
console.log(`   Created contact ID: ${contactId}\n`);

// 2. Create a test payment
console.log('2. Creating test payment...');
const paymentStmt = db.prepare(`
  INSERT INTO payments (
    payment_no, contact_id, payment_date, booking_period,
    currency, amount_net, tax_amount, total_amount,
    description, created_by_type, created_by_id, created_by_name
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const paymentResult = paymentStmt.run(
  `P-SEPA-${Date.now()}`,
  contactId,
  '2026-04-15',
  '2026-04',
  'EUR',
  1500.00,
  0,
  1500.00,
  'Demo SEPA payment',
  'system',
  'demo',
  'Demo User'
);
const paymentId = paymentResult.lastInsertRowid;
console.log(`   Created payment ID: ${paymentId}, Amount: 1500.00 EUR\n`);

// 3. Validate IBAN and BIC
console.log('3. Validating bank details...');
const ibanValidation = sepaService.validateIBAN('DE89370400440532013000');
const bicValidation = sepaService.validateBIC('DEUTDEFF');
console.log(`   IBAN Validation: ${ibanValidation.valid ? '✓' : '✗'} ${ibanValidation.errors.join(', ') || 'Valid'}`);
console.log(`   BIC Validation: ${bicValidation.valid ? '✓' : '✗'} ${bicValidation.errors.join(', ') || 'Valid'}\n`);

// 4. Generate SEPA file
console.log('4. Generating SEPA file...');
try {
  const sepaResult = sepaService.createSEPAFile(
    [paymentId],
    { id: 'demo', name: 'Demo User', authType: 'system' },
    {
      initiatorName: 'TechParts GmbH',
      initiatorIban: 'AT611904300234573201',
      initiatorBic: 'BKAUATWW',
      description: 'Demo SEPA Credit Transfer'
    }
  );
  
  console.log(`   ✓ SEPA file created successfully!`);
  console.log(`   File ID: ${sepaResult.fileId}`);
  console.log(`   File Name: ${sepaResult.fileName}`);
  console.log(`   Payment Count: ${sepaResult.paymentCount}`);
  console.log(`   Total Amount: ${sepaResult.amount.toFixed(2)} EUR`);
  console.log(`   Linked Payments: ${sepaResult.linkedCount}\n`);
  
  // 5. Show SEPA file details
  console.log('5. Retrieving SEPA file from database...');
  const sepaFile = sepaService.getSepaFile(sepaResult.fileId);
  console.log(`   ✓ File retrieved: ${sepaFile.file_name}`);
  console.log(`   Created: ${sepaFile.created_at}`);
  console.log(`   Initiator: ${sepaFile.initiator_name}`);
  console.log(`   Message ID: ${sepaFile.message_id}\n`);
  
  // 6. Show XML snippet
  console.log('6. SEPA XML snippet (first 500 chars):');
  const xmlPreview = sepaFile.xml_content.substring(0, 500) + '...';
  console.log(xmlPreview + '\n');
  
  // 7. Verify payment was linked
  console.log('7. Verifying payment linkage...');
  const paymentCheck = db.prepare('SELECT sepa_file_id, included_in_sepa_at FROM payments WHERE id = ?').get(paymentId);
  console.log(`   Payment ${paymentId} SEPA File ID: ${paymentCheck.sepa_file_id}`);
  console.log(`   Included at: ${paymentCheck.included_in_sepa_at}\n`);
  
  console.log('=== Demo Completed Successfully ===');
  
} catch (error) {
  console.error(`   ✗ Error: ${error.message}`);
  console.error(error.stack);
}

// Cleanup
console.log('Cleaning up demo data...');
db.prepare('DELETE FROM sepa_files WHERE created_by_id = ?').run('demo');
db.prepare('DELETE FROM payments WHERE created_by_id = ?').run('demo');
db.prepare('DELETE FROM contacts WHERE contact_no LIKE ?').run('C-SEPA-TEST-%');
console.log('Demo cleanup complete.');