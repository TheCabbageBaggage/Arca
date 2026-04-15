const { openDatabase } = require('./src/db/client');
const db = openDatabase();

// Check if SEPA tables exist
const sepaTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%sepa%'").all();
console.log('SEPA tables:', sepaTables);

// Check sepa_files schema
const sepaFilesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sepa_files'").get();
console.log('\nsepa_files schema:', sepaFilesSchema?.sql);

// Check if columns were added to payments
const paymentsInfo = db.prepare("PRAGMA table_info(payments)").all();
const sepaColumns = paymentsInfo.filter(col => col.name.includes('sepa') || col.name.includes('iban') || col.name.includes('bic'));
console.log('\nSEPA-related columns in payments table:', sepaColumns);

// Check if columns were added to contacts
const contactsInfo = db.prepare("PRAGMA table_info(contacts)").all();
const contactBankColumns = contactsInfo.filter(col => col.name.includes('iban') || col.name.includes('bic'));
console.log('\nBank detail columns in contacts table:', contactBankColumns);