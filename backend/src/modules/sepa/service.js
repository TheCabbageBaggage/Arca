const SepaRepository = require('./repository');

class SepaService {
  constructor(repository = new SepaRepository()) {
    this.repository = repository;
  }

  // Generate a simple message ID
  generateMessageId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `SEPA-${timestamp}-${random}`.toUpperCase();
  }

  // Validate IBAN format (simplified - checks format but not checksum for now)
  validateIBAN(iban) {
    if (!iban || typeof iban !== 'string') {
      return { valid: false, errors: ['IBAN is required'] };
    }

    // Clean up: remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
    
    // Basic format validation: country code (2 letters) + check digits (2 digits) + BBAN (up to 30 chars)
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    if (!ibanRegex.test(cleanIban)) {
      return { valid: false, errors: ['Invalid IBAN format'] };
    }

    // For now, accept all IBANs that match the format
    // In production, you would implement full checksum validation
    return {
      valid: true,
      errors: [],
      normalized: cleanIban
    };
  }

  // Validate BIC/SWIFT format
  validateBIC(bic) {
    if (!bic || typeof bic !== 'string') {
      return { valid: false, errors: ['BIC is required'] };
    }

    const cleanBic = bic.replace(/\s+/g, '').toUpperCase();
    
    // BIC format: 8 or 11 characters
    // First 4 letters: bank code
    // Next 2 letters: country code
    // Next 2 letters/numbers: location code
    // Optional 3 letters/numbers: branch code
    const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    
    if (!bicRegex.test(cleanBic)) {
      return { valid: false, errors: ['Invalid BIC format'] };
    }

    return {
      valid: true,
      errors: [],
      normalized: cleanBic
    };
  }

  // Validate payment for SEPA inclusion
  validatePayment(payment) {
    const errors = [];
    
    if (!payment) {
      return { valid: false, errors: ['Payment is required'] };
    }

    if (!payment.id) {
      errors.push('Payment ID is required');
    }

    if (!payment.total_amount || payment.total_amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (!payment.currency || payment.currency !== 'EUR') {
      errors.push('SEPA payments must be in EUR');
    }

    // Check recipient IBAN
    const ibanValidation = this.validateIBAN(payment.recipient_iban);
    if (!ibanValidation.valid) {
      errors.push(`Recipient IBAN invalid: ${ibanValidation.errors.join(', ')}`);
    }

    // Check recipient BIC
    const bicValidation = this.validateBIC(payment.recipient_bic);
    if (!bicValidation.valid) {
      errors.push(`Recipient BIC invalid: ${bicValidation.errors.join(', ')}`);
    }

    if (!payment.recipient_name || payment.recipient_name.trim() === '') {
      errors.push('Recipient name is required');
    }

    return {
      valid: errors.length === 0,
      errors,
      payment: {
        ...payment,
        recipient_iban: ibanValidation.normalized,
        recipient_bic: bicValidation.normalized
      }
    };
  }

  // Generate SEPA XML (pain.001.001.03)
  generateSEPAFile(payments, options = {}) {
    const {
      initiatorName = 'TechParts GmbH',
      initiatorIban = 'AT611904300234573201',
      initiatorBic = 'BKAUATWW',
      messageId = this.generateMessageId(),
      date = new Date().toISOString().split('T')[0]
    } = options;

    // Validate initiator details
    const initiatorIbanValid = this.validateIBAN(initiatorIban);
    const initiatorBicValid = this.validateBIC(initiatorBic);
    
    if (!initiatorIbanValid.valid || !initiatorBicValid.valid) {
      throw new Error(`Invalid initiator details: IBAN: ${initiatorIbanValid.errors.join(', ')}, BIC: ${initiatorBicValid.errors.join(', ')}`);
    }

    // Validate all payments
    const validatedPayments = [];
    const validationErrors = [];
    
    for (const payment of payments) {
      const validation = this.validatePayment(payment);
      if (validation.valid) {
        validatedPayments.push(validation.payment);
      } else {
        validationErrors.push(`Payment ${payment.id}: ${validation.errors.join(', ')}`);
      }
    }

    if (validatedPayments.length === 0) {
      throw new Error(`No valid payments for SEPA file: ${validationErrors.join('; ')}`);
    }

    // Calculate total amount
    const totalAmount = validatedPayments.reduce((sum, payment) => sum + payment.total_amount, 0);
    
    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${messageId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${validatedPayments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${this.escapeXml(initiatorName)}</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>${initiatorIbanValid.normalized}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${messageId}-01</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${validatedPayments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${date}</ReqdExctnDt>
      <Dbtr>
        <Nm>${this.escapeXml(initiatorName)}</Nm>
        <PstlAdr>
          <Ctry>AT</Ctry>
        </PstlAdr>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${initiatorIbanValid.normalized}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${initiatorBicValid.normalized}</BIC>
        </FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      ${validatedPayments.map((payment, index) => `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${payment.id}-${date}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${payment.currency}">${payment.total_amount.toFixed(2)}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <BIC>${payment.recipient_bic}</BIC>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${this.escapeXml(payment.recipient_name)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${payment.recipient_iban}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${this.escapeXml(payment.description || `Payment ${payment.payment_no || payment.id}`)}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`).join('')}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    return {
      xml,
      paymentCount: validatedPayments.length,
      totalAmount,
      messageId,
      validationErrors
    };
  }

  // Create SEPA file from payment IDs
  createSEPAFile(paymentIds, actor, options = {}) {
    if (!paymentIds || paymentIds.length === 0) {
      throw new Error('At least one payment ID is required');
    }

    // Get payments from database
    const payments = this.repository.getPaymentsByIds(paymentIds);
    
    if (payments.length === 0) {
      throw new Error('No valid payments found for the provided IDs');
    }

    // Check for payments already included in SEPA
    const alreadyIncluded = payments.filter(p => p.sepa_file_id);
    if (alreadyIncluded.length > 0) {
      throw new Error(`Some payments are already included in SEPA files: ${alreadyIncluded.map(p => p.id).join(', ')}`);
    }

    // Prepare payments for SEPA generation
    const sepaPayments = payments.map(payment => ({
      id: payment.id,
      payment_no: payment.payment_no,
      total_amount: payment.total_amount,
      currency: payment.currency || 'EUR',
      recipient_name: payment.recipient_name || '',
      recipient_iban: payment.recipient_iban || payment.iban || '',
      recipient_bic: payment.recipient_bic || payment.bic || '',
      description: payment.description || `Payment ${payment.payment_no}`
    }));

    // Generate SEPA XML
    const sepaResult = this.generateSEPAFile(sepaPayments, options);
    
    // Create file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `SEPA-${timestamp}-${sepaResult.messageId}.xml`;

    // Create actor info
    const actorInfo = {
      type: actor?.authType || actor?.type || 'system',
      id: actor?.id ? String(actor.id) : 'system',
      name: actor?.name || actor?.username || 'system'
    };

    // Create SEPA file record
    const sepaFileId = this.repository.createSepaFile({
      file_name: fileName,
      xml_content: sepaResult.xml,
      payment_count: sepaResult.paymentCount,
      total_amount: sepaResult.totalAmount,
      initiator_name: options.initiatorName || 'TechParts GmbH',
      initiator_iban: options.initiatorIban || 'AT611904300234573201',
      initiator_bic: options.initiatorBic || 'BKAUATWW',
      message_id: sepaResult.messageId,
      description: options.description,
      created_by_type: actorInfo.type,
      created_by_id: actorInfo.id,
      created_by_name: actorInfo.name
    });

    // Link payments to SEPA file
    const linkedCount = this.repository.linkPaymentsToSepaFile(
      payments.map(p => p.id),
      sepaFileId
    );

    return {
      fileId: sepaFileId,
      fileName,
      xml: sepaResult.xml,
      amount: sepaResult.totalAmount,
      paymentCount: sepaResult.paymentCount,
      linkedCount,
      validationErrors: sepaResult.validationErrors
    };
  }

  // Get SEPA file for download
  getSepaFile(fileId) {
    const sepaFile = this.repository.getSepaFile(fileId);
    if (!sepaFile) {
      throw new Error('SEPA file not found');
    }
    return sepaFile;
  }

  // List SEPA files
  listSepaFiles(filters = {}) {
    return this.repository.listSepaFiles(filters);
  }

  // Update contact bank details
  updateContactBankDetails(contactId, iban, bic, actor) {
    // Validate IBAN and BIC
    const ibanValidation = this.validateIBAN(iban);
    if (!ibanValidation.valid) {
      throw new Error(`Invalid IBAN: ${ibanValidation.errors.join(', ')}`);
    }

    const bicValidation = this.validateBIC(bic);
    if (!bicValidation.valid) {
      throw new Error(`Invalid BIC: ${bicValidation.errors.join(', ')}`);
    }

    // Update contact
    const updated = this.repository.updateContactBankDetails(
      contactId,
      ibanValidation.normalized,
      bicValidation.normalized
    );

    if (!updated) {
      throw new Error('Contact not found');
    }

    return {
      contactId,
      iban: ibanValidation.normalized,
      bic: bicValidation.normalized,
      updated: true
    };
  }

  // Helper: escape XML special characters
  escapeXml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = SepaService;