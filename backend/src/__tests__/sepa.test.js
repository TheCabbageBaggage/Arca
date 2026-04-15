const test = require('node:test');
const assert = require('node:assert/strict');
const { createM5Harness } = require('./helpers/m5-harness');

test('SEPA IBAN validation works correctly', async () => {
  const harness = await createM5Harness();
  
  try {
    // Test valid IBAN formats
    const validIbans = [
      'AT611904300234573201', // Austrian IBAN format
      'DE89370400440532013000', // German IBAN format
      'GB29NWBK60161331926819', // UK IBAN format
    ];
    
    for (const iban of validIbans) {
      const result = harness.sepaService.validateIBAN(iban);
      assert.equal(result.valid, true, `IBAN ${iban} should be valid format`);
      assert.equal(result.errors.length, 0, `IBAN ${iban} should have no errors`);
    }
    
    // Test invalid IBANs
    const invalidIbans = [
      'AT61190430023457320', // Too short
      'GB29NWBK601613319268190', // Too long
      'XX1234567890', // Invalid country code
      '', // Empty
    ];
    
    for (const iban of invalidIbans) {
      const result = harness.sepaService.validateIBAN(iban);
      assert.equal(result.valid, false, `IBAN ${iban} should be invalid`);
      assert.ok(result.errors.length > 0, `IBAN ${iban} should have errors`);
    }
  } finally {
    await harness.close();
  }
});

test('SEPA BIC validation works correctly', async () => {
  const harness = await createM5Harness();
  
  try {
    // Test valid BICs
    const validBics = [
      'BKAUATWW', // 8 characters
      'BKAUATWWXXX', // 11 characters
      'DEUTDEFF', // German BIC
    ];
    
    for (const bic of validBics) {
      const result = harness.sepaService.validateBIC(bic);
      assert.equal(result.valid, true, `BIC ${bic} should be valid`);
      assert.equal(result.errors.length, 0, `BIC ${bic} should have no errors`);
    }
    
    // Test invalid BICs
    const invalidBics = [
      'BKAUATW', // Too short
      'BKAUATWWXXXX', // Too long
      '12345678', // No letters
      'BKAUATW1', // Invalid format
      '', // Empty
    ];
    
    for (const bic of invalidBics) {
      const result = harness.sepaService.validateBIC(bic);
      assert.equal(result.valid, false, `BIC ${bic} should be invalid`);
      assert.ok(result.errors.length > 0, `BIC ${bic} should have errors`);
    }
  } finally {
    await harness.close();
  }
});

test('SEPA file generation creates valid XML', async () => {
  const harness = await createM5Harness();
  
  try {
    // Create test contacts with bank details
    const contact1Id = harness.createTestContact({
      name: 'Supplier A',
      iban: 'AT611904300234573201',
      bic: 'BKAUATWW'
    });
    
    const contact2Id = harness.createTestContact({
      name: 'Supplier B', 
      iban: 'DE89370400440532013000',
      bic: 'DEUTDEFF'
    });
    
    // Create test payments
    const payment1 = harness.financeService.createPayment({
      contact_id: contact1Id,
      payment_date: '2026-04-15',
      total_amount: 500,
      amount_net: 500,
      currency: 'EUR',
      description: 'Payment to Supplier A'
    }, { id: 'test', name: 'Test User', authType: 'jwt' });
    
    const payment2 = harness.financeService.createPayment({
      contact_id: contact2Id,
      payment_date: '2026-04-15',
      total_amount: 750.50,
      amount_net: 750.50,
      currency: 'EUR',
      description: 'Payment to Supplier B'
    }, { id: 'test', name: 'Test User', authType: 'jwt' });
    
    // Generate SEPA file
    const result = harness.sepaService.createSEPAFile(
      [payment1.id, payment2.id],
      { id: 'test', name: 'Test User', authType: 'jwt' },
      {
        initiatorName: 'TechParts GmbH',
        initiatorIban: 'AT611904300234573201',
        initiatorBic: 'BKAUATWW',
        description: 'Test SEPA file'
      }
    );
    
    // Verify result
    assert.ok(result.fileId, 'Should have file ID');
    assert.ok(result.fileName, 'Should have file name');
    assert.ok(result.xml, 'Should have XML content');
    assert.equal(result.paymentCount, 2, 'Should include 2 payments');
    assert.equal(result.amount, 1250.50, 'Total amount should be 1250.50');
    assert.equal(result.linkedCount, 2, 'Should link 2 payments');
    
    // Verify XML structure
    assert.ok(result.xml.includes('<?xml'), 'Should have XML declaration');
    assert.ok(result.xml.includes('pain.001.001.03'), 'Should be pain.001.001.03 format');
    assert.ok(result.xml.includes('TechParts GmbH'), 'Should contain initiator name');
    assert.ok(result.xml.includes('AT611904300234573201'), 'Should contain initiator IBAN');
    assert.ok(result.xml.includes('Supplier A'), 'Should contain recipient names');
    assert.ok(result.xml.includes('Supplier B'), 'Should contain recipient names');
    assert.ok(result.xml.includes('500.00'), 'Should contain first payment amount');
    assert.ok(result.xml.includes('750.50'), 'Should contain second payment amount');
    
    // Verify database records
    const sepaFile = harness.sepaRepository.getSepaFile(result.fileId);
    assert.ok(sepaFile, 'SEPA file should exist in database');
    assert.equal(sepaFile.payment_count, 2, 'Database should show 2 payments');
    assert.equal(sepaFile.total_amount, 1250.50, 'Database should show correct total');
    
    const linkedPayments = harness.sepaRepository.getPaymentsForSepaFile(result.fileId);
    assert.equal(linkedPayments.length, 2, 'Should have 2 linked payments');
    
    // Verify payments are marked as included
    for (const payment of linkedPayments) {
      assert.equal(payment.sepa_file_id, result.fileId, 'Payment should be linked to SEPA file');
      assert.ok(payment.included_in_sepa_at, 'Payment should have inclusion timestamp');
    }
  } finally {
    await harness.close();
  }
});

test('SEPA file download works', async () => {
  const harness = await createM5Harness();
  
  try {
    // Create test data and SEPA file
    const contactId = harness.createTestContact({
      name: 'Test Supplier',
      iban: 'AT611904300234573201',
      bic: 'BKAUATWW'
    });
    
    const payment = harness.financeService.createPayment({
      contact_id: contactId,
      payment_date: '2026-04-15',
      total_amount: 1000,
      amount_net: 1000,
      currency: 'EUR',
      description: 'Test payment'
    }, { id: 'test', name: 'Test User', authType: 'jwt' });
    
    const result = harness.sepaService.createSEPAFile(
      [payment.id],
      { id: 'test', name: 'Test User', authType: 'jwt' }
    );
    
    // Test getSepaFile method
    const sepaFile = harness.sepaService.getSepaFile(result.fileId);
    assert.ok(sepaFile, 'Should retrieve SEPA file');
    assert.equal(sepaFile.id, result.fileId, 'File IDs should match');
    assert.equal(sepaFile.file_name, result.fileName, 'File names should match');
    assert.equal(sepaFile.xml_content, result.xml, 'XML content should match');
    
    // Test with invalid ID
    assert.throws(
      () => harness.sepaService.getSepaFile(999999),
      (error) => {
        assert.ok(error.message.includes('not found'), 'Should throw for non-existent file');
        return true;
      }
    );
  } finally {
    await harness.close();
  }
});