import type { Bill } from '../../shared/types/bill';
import { getCurrentTerm, parseTermCode } from '../../shared/utils/term';
import type { D1Database } from './d1';
import { createError } from 'h3';

interface BillRow {
  id: number;
  row_index: number;
  bill_number: string;
  term: number | null;
  serial_number: number | null;
  submitted_at: string;
  proposing_entity: string;
  proposer_name: string;
  contact_name: string;
  bill_type: string;
  subject: string;
  description: string;
  proposed_action: string;
  scheduled_session: string;
}

interface AttachmentRow {
  bill_id: number;
  url: string;
}

type BillInput = Partial<Bill> & Pick<Bill, 'subject'>;

const BILL_COLUMNS = `
  id,
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
  scheduled_session
`;

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAttachments(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanString(item)).filter((item): item is string => Boolean(item));
}

function parseBillNumber(billNumber: string): Pick<Bill, 'term' | 'serialNumber'> {
  if (!billNumber) {
    return { term: getCurrentTerm(), serialNumber: null };
  }

  const match = billNumber.match(/^((?:\d+-[12])|(?:\d{3}))(?:屆|會期)?北大峽議字第(\d+)號$/);
  if (!match) {
    return { term: null, serialNumber: null };
  }

  return {
    term: parseTermCode(match[1]),
    serialNumber: parseInt(match[2], 10),
  };
}

function rowToBill(row: BillRow, attachments: string[]): Bill {
  return {
    rowIndex: row.row_index,
    billNumber: row.bill_number,
    term: row.term,
    serialNumber: row.serial_number,
    submittedAt: row.submitted_at,
    proposingEntity: row.proposing_entity,
    proposerName: row.proposer_name,
    contactName: row.contact_name,
    billType: row.bill_type,
    subject: row.subject,
    description: row.description,
    proposedAction: row.proposed_action,
    attachments,
    scheduledSession: row.scheduled_session,
  };
}

async function getAttachmentsByBillId(
  db: D1Database,
  billIds: number[],
): Promise<Map<number, string[]>> {
  if (!billIds.length) return new Map();

  const placeholders = billIds.map(() => '?').join(', ');
  const { results = [] } = await db
    .prepare(
      `SELECT bill_id, url
       FROM bill_attachments
       WHERE bill_id IN (${placeholders})
       ORDER BY bill_id ASC, position ASC`,
    )
    .bind(...billIds)
    .all<AttachmentRow>();

  const attachmentsByBillId = new Map<number, string[]>();

  for (const row of results) {
    const current = attachmentsByBillId.get(row.bill_id) ?? [];
    current.push(row.url);
    attachmentsByBillId.set(row.bill_id, current);
  }

  return attachmentsByBillId;
}

async function rowsToBills(db: D1Database, rows: BillRow[]): Promise<Bill[]> {
  const attachmentsByBillId = await getAttachmentsByBillId(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => rowToBill(row, attachmentsByBillId.get(row.id) ?? []));
}

async function findLatestTerm(db: D1Database): Promise<number | null> {
  const row = await db
    .prepare('SELECT MAX(term) AS latest_term FROM bills WHERE term IS NOT NULL')
    .first<{ latest_term: number | null }>();

  return row?.latest_term ?? null;
}

async function resolveRowIndex(db: D1Database, bill: Bill): Promise<number> {
  if (Number.isInteger(bill.rowIndex) && bill.rowIndex > 0) {
    return bill.rowIndex;
  }

  if (bill.term && bill.serialNumber) {
    const existing = await db
      .prepare('SELECT row_index FROM bills WHERE term = ? AND serial_number = ?')
      .bind(bill.term, bill.serialNumber)
      .first<{ row_index: number }>();

    if (existing) return existing.row_index;
  }

  const next = await db
    .prepare('SELECT COALESCE(MAX(row_index), 1) + 1 AS next_row_index FROM bills')
    .first<{ next_row_index: number }>();

  return next?.next_row_index ?? 2;
}

function normalizeBillInput(input: BillInput): Bill {
  const billNumber = cleanString(input.billNumber);
  const parsed = parseBillNumber(billNumber);
  const term = parseTermCode(input.term) ?? parsed.term;
  const serialNumber = toNullableNumber(input.serialNumber) ?? parsed.serialNumber;

  return {
    rowIndex: toNullableNumber(input.rowIndex) ?? 0,
    billNumber,
    term,
    serialNumber,
    submittedAt: cleanString(input.submittedAt),
    proposingEntity: cleanString(input.proposingEntity),
    proposerName: cleanString(input.proposerName),
    contactName: cleanString(input.contactName),
    billType: cleanString(input.billType),
    subject: cleanString(input.subject),
    description: cleanString(input.description),
    proposedAction: cleanString(input.proposedAction),
    attachments: normalizeAttachments(input.attachments),
    scheduledSession: cleanString(input.scheduledSession),
  };
}

export function createBillRepository(db: D1Database) {
  const getBills = async (whereClause = '', values: (string | number | null)[] = []) => {
    const statement = db.prepare(
      `SELECT ${BILL_COLUMNS}
       FROM bills
       ${whereClause}
       ORDER BY row_index ASC`,
    );
    const prepared = values.length ? statement.bind(...values) : statement;
    const { results = [] } = await prepared.all<BillRow>();

    return rowsToBills(db, results);
  };

  const getAllBills = () => getBills();

  const getLatestTermBills = async () => {
    const latestTerm = await findLatestTerm(db);
    if (!latestTerm) return [];
    return getBills('WHERE term = ?', [latestTerm]);
  };

  const getPastTermBills = async () => {
    const latestTerm = await findLatestTerm(db);
    if (!latestTerm) return [];
    return getBills('WHERE term IS NULL OR term != ?', [latestTerm]);
  };

  const getBillsByTerm = (targetTerm: number) => getBills('WHERE term = ?', [targetTerm]);

  const getBillByRowIndex = async (targetRowIndex: number) => {
    const bills = await getBills('WHERE row_index = ?', [targetRowIndex]);
    return bills[0];
  };

  const getBillById = async (targetTerm: number, targetSerialNumber: number) => {
    const bills = await getBills('WHERE term = ? AND serial_number = ?', [
      targetTerm,
      targetSerialNumber,
    ]);
    return bills[0];
  };

  const saveBill = async (input: BillInput) => {
    const bill = normalizeBillInput(input);
    bill.rowIndex = await resolveRowIndex(db, bill);

    if (!bill.subject) {
      throw createError({ statusCode: 400, statusMessage: '案由為必填欄位' });
    }

    const existing = await db
      .prepare('SELECT id FROM bills WHERE row_index = ?')
      .bind(bill.rowIndex)
      .first<{ id: number }>();

    if (existing) {
      await db
        .prepare(
          `UPDATE bills
           SET bill_number = ?,
               term = ?,
               serial_number = ?,
               submitted_at = ?,
               proposing_entity = ?,
               proposer_name = ?,
               contact_name = ?,
               bill_type = ?,
               subject = ?,
               description = ?,
               proposed_action = ?,
               scheduled_session = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .bind(
          bill.billNumber,
          bill.term,
          bill.serialNumber,
          bill.submittedAt,
          bill.proposingEntity,
          bill.proposerName,
          bill.contactName,
          bill.billType,
          bill.subject,
          bill.description,
          bill.proposedAction,
          bill.scheduledSession,
          existing.id,
        )
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO bills (
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
             scheduled_session
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          bill.rowIndex,
          bill.billNumber,
          bill.term,
          bill.serialNumber,
          bill.submittedAt,
          bill.proposingEntity,
          bill.proposerName,
          bill.contactName,
          bill.billType,
          bill.subject,
          bill.description,
          bill.proposedAction,
          bill.scheduledSession,
        )
        .run();
    }

    const saved = await db
      .prepare('SELECT id FROM bills WHERE row_index = ?')
      .bind(bill.rowIndex)
      .first<{ id: number }>();

    if (!saved) {
      throw createError({ statusCode: 500, statusMessage: '議案寫入失敗' });
    }

    await db.prepare('DELETE FROM bill_attachments WHERE bill_id = ?').bind(saved.id).run();

    if (bill.attachments.length) {
      await db.batch(
        bill.attachments.map((url, index) =>
          db
            .prepare('INSERT INTO bill_attachments (bill_id, position, url) VALUES (?, ?, ?)')
            .bind(saved.id, index + 1, url),
        ),
      );
    }

    const savedBill = await getBillByRowIndex(bill.rowIndex);

    if (!savedBill) {
      throw createError({ statusCode: 500, statusMessage: '議案寫入後讀取失敗' });
    }

    return savedBill;
  };

  return {
    getAllBills,
    getLatestTermBills,
    getPastTermBills,
    getBillsByTerm,
    getBillByRowIndex,
    getBillById,
    saveBill,
  };
}
