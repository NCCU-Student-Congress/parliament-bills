import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.argv[2] || 'tmp/legislative-data-main/data';

function readJson(filename) {
  const filePath = path.resolve(process.cwd(), dataDir, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  return Number.isFinite(value) ? String(value) : 'NULL';
}

function normalizeBill(bill, cachedAt) {
  return {
    rowIndex: Number(bill.rowIndex),
    billNumber: bill.billNumber ?? '',
    term: Number.isFinite(bill.term) ? Number(bill.term) : null,
    serialNumber: Number.isFinite(bill.serialNumber) ? Number(bill.serialNumber) : null,
    submittedAt: bill.submittedAt ?? '',
    proposingEntity: bill.proposingEntity ?? '',
    proposerName: bill.proposerName ?? '',
    contactName: bill.contactName ?? '',
    billType: bill.billType ?? '',
    subject: bill.subject ?? '',
    description: bill.description ?? '',
    proposedAction: bill.proposedAction ?? '',
    attachments: Array.isArray(bill.attachments) ? bill.attachments.filter(Boolean) : [],
    scheduledSession: bill.scheduledSession ?? '',
    cachedAt,
  };
}

const latest = readJson('bill_latestTerm.json');
const past = readJson('bill_pastTerms.json');
const bills = [
  ...latest.data.map((bill) => normalizeBill(bill, latest.cachedAt)),
  ...past.data.map((bill) => normalizeBill(bill, past.cachedAt)),
].sort((a, b) => a.rowIndex - b.rowIndex);

console.log('PRAGMA defer_foreign_keys = TRUE;');
console.log('BEGIN TRANSACTION;');
console.log('DELETE FROM bill_attachments;');
console.log('DELETE FROM bills;');

for (const bill of bills) {
  console.log(`INSERT INTO bills (
  row_index,
  bill_number,
  term,
  serial_number,
  submitted_at,
  proposing_entity,
  proposer_name,
  contact_name,
  bill_type,
  subject,
  description,
  proposed_action,
  scheduled_session,
  cached_at
) VALUES (
  ${sqlNumber(bill.rowIndex)},
  ${sqlString(bill.billNumber)},
  ${sqlNumber(bill.term)},
  ${sqlNumber(bill.serialNumber)},
  ${sqlString(bill.submittedAt)},
  ${sqlString(bill.proposingEntity)},
  ${sqlString(bill.proposerName)},
  ${sqlString(bill.contactName)},
  ${sqlString(bill.billType)},
  ${sqlString(bill.subject)},
  ${sqlString(bill.description)},
  ${sqlString(bill.proposedAction)},
  ${sqlString(bill.scheduledSession)},
  ${sqlString(bill.cachedAt)}
);`);

  bill.attachments.forEach((url, index) => {
    console.log(`INSERT INTO bill_attachments (bill_id, position, url)
VALUES (
  (SELECT id FROM bills WHERE row_index = ${sqlNumber(bill.rowIndex)}),
  ${index + 1},
  ${sqlString(url)}
);`);
  });
}

console.log('COMMIT;');
