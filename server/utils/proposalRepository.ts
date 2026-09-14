import { createError } from 'h3';
import type {
  Committee,
  Meeting,
  Proposal,
  ProposalAttachment,
  ProposalCosponsor,
  ProposalInput,
  Session,
  User,
} from '../../shared/types/bill';
import { getCurrentTerm, getEarliestTerm, parseTermCode } from '../../shared/utils/term';
import type { D1Database } from './d1';

interface CommitteeRow {
  id: number;
  name: string;
  code: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  permission_role: string;
  committee_ids: string;
  created_at: string;
  updated_at: string;
}

interface SessionRow {
  id: number;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MeetingRow {
  id: number;
  committee_id: number | null;
  committee_name?: string | null;
  session: number;
  meeting_date: string;
  proposal_deadline_at: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ProposalRow {
  id: number;
  committee_id: number;
  committee_name: string;
  session: number;
  proposed_at: string;
  proposer_id: number;
  proposer_name: string;
  proposer_email: string;
  meeting_id: number;
  meeting_title: string;
  meeting_date: string;
  proposal_deadline_at: string;
  subject: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface AttachmentRow {
  id: number;
  proposal_id: number;
  kind: 'file' | 'link';
  url: string;
  r2_key: string | null;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

interface CosponsorRow {
  id: number;
  proposal_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  status: ProposalCosponsor['status'];
  invited_at: string | null;
  confirmed_at: string | null;
  declined_at: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface NormalizedProposalInput {
  committeeId: number;
  session: number;
  proposedAt: string;
  proposerId: number;
  meetingId: number;
  subject: string;
  description: string;
  attachments: ProposalAttachment[];
  cosponsorIds: number[];
}

const PROPOSAL_COLUMNS = `
  proposals.id,
  proposals.committee_id,
  committees.name AS committee_name,
  proposals.session,
  proposals.proposed_at,
  proposals.proposer_id,
  proposers.name AS proposer_name,
  proposers.email AS proposer_email,
  proposals.meeting_id,
  meetings.title AS meeting_title,
  meetings.meeting_date,
  meetings.proposal_deadline_at,
  proposals.subject,
  proposals.description,
  proposals.created_at,
  proposals.updated_at
`;

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeDateTime(value: unknown, fallback = new Date().toISOString()): string {
  const raw = cleanString(value);
  if (!raw) return fallback;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

function parseJsonArray(value: string): number[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => Number(item))
      .filter((item): item is number => Number.isInteger(item) && item > 0);
  } catch {
    return [];
  }
}

function getNextTermCode(term: number): number {
  const congress = Math.floor(term / 10);
  const session = term % 10;

  return session === 1 ? congress * 10 + 2 : (congress + 1) * 10 + 1;
}

function getSessionDefaults(id: number): Pick<Session, 'title' | 'startsAt' | 'endsAt'> {
  const congress = Math.floor(id / 10);
  const session = id % 10;
  const title = `${congress}-${session} 會期`;

  if (session === 1) {
    return {
      title,
      startsAt: `${congress + 1999}-08-01`,
      endsAt: `${congress + 2000}-01-31`,
    };
  }

  return {
    title,
    startsAt: `${congress + 2000}-02-01`,
    endsAt: `${congress + 2000}-07-31`,
  };
}

function getTaipeiDateString(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function rowToCommittee(row: CommitteeRow): Committee {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    permissionRole: row.permission_role,
    committeeIds: parseJsonArray(row.committee_ids),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    committeeId: row.committee_id,
    committeeName: row.committee_name ?? '大會',
    session: row.session,
    meetingDate: row.meeting_date,
    proposalDeadlineAt: row.proposal_deadline_at,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToAttachment(row: AttachmentRow): ProposalAttachment {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    kind: row.kind,
    url: row.url,
    r2Key: row.r2_key,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

function rowToCosponsor(row: CosponsorRow): ProposalCosponsor {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    status: row.status,
    invitedAt: row.invited_at,
    confirmedAt: row.confirmed_at,
    declinedAt: row.declined_at,
    tokenExpiresAt: row.token_expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProposal(
  row: ProposalRow,
  attachments: ProposalAttachment[],
  cosponsors: ProposalCosponsor[],
): Proposal {
  return {
    id: row.id,
    committeeId: row.committee_id,
    committeeName: row.committee_name,
    session: row.session,
    proposedAt: row.proposed_at,
    proposerId: row.proposer_id,
    proposerName: row.proposer_name,
    proposerEmail: row.proposer_email,
    meetingId: row.meeting_id,
    meetingTitle: row.meeting_title,
    meetingDate: row.meeting_date,
    proposalDeadlineAt: row.proposal_deadline_at,
    subject: row.subject,
    description: row.description,
    attachments,
    cosponsors,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeAttachments(value: ProposalInput['attachments']): ProposalAttachment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const url = cleanString(item);
        if (!url) return null;
        return { kind: 'link' as const, url };
      }

      const url = cleanString(item?.url);
      if (!url) return null;

      return {
        kind: item?.kind === 'file' ? 'file' : 'link',
        url,
        r2Key: cleanString(item?.r2Key) || null,
        filename: cleanString(item?.filename) || null,
        mimeType: cleanString(item?.mimeType) || null,
        sizeBytes: toPositiveInteger(item?.sizeBytes),
      };
    })
    .filter((item): item is ProposalAttachment => Boolean(item));
}

function normalizeCosponsorIds(value: unknown, proposerId: number): number[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.map(toPositiveInteger))]
    .filter((id): id is number => Boolean(id))
    .filter((id) => id !== proposerId);
}

async function getAttachmentsByProposalId(
  db: D1Database,
  proposalIds: number[],
): Promise<Map<number, ProposalAttachment[]>> {
  if (!proposalIds.length) return new Map();

  const placeholders = proposalIds.map(() => '?').join(', ');
  const { results = [] } = await db
    .prepare(
      `SELECT id, proposal_id, kind, url, r2_key, filename, mime_type, size_bytes, created_at
       FROM proposal_attachments
       WHERE proposal_id IN (${placeholders})
       ORDER BY id ASC`,
    )
    .bind(...proposalIds)
    .all<AttachmentRow>();

  const map = new Map<number, ProposalAttachment[]>();
  for (const row of results) {
    const current = map.get(row.proposal_id) ?? [];
    current.push(rowToAttachment(row));
    map.set(row.proposal_id, current);
  }

  return map;
}

async function getCosponsorsByProposalId(
  db: D1Database,
  proposalIds: number[],
): Promise<Map<number, ProposalCosponsor[]>> {
  if (!proposalIds.length) return new Map();

  const placeholders = proposalIds.map(() => '?').join(', ');
  const { results = [] } = await db
    .prepare(
      `SELECT
         proposal_cosponsors.id,
         proposal_cosponsors.proposal_id,
         proposal_cosponsors.user_id,
         users.name AS user_name,
         users.email AS user_email,
         proposal_cosponsors.status,
         proposal_cosponsors.invited_at,
         proposal_cosponsors.confirmed_at,
         proposal_cosponsors.declined_at,
         proposal_cosponsors.token_expires_at,
         proposal_cosponsors.created_at,
         proposal_cosponsors.updated_at
       FROM proposal_cosponsors
       INNER JOIN users ON users.id = proposal_cosponsors.user_id
       WHERE proposal_cosponsors.proposal_id IN (${placeholders})
       ORDER BY proposal_cosponsors.id ASC`,
    )
    .bind(...proposalIds)
    .all<CosponsorRow>();

  const map = new Map<number, ProposalCosponsor[]>();
  for (const row of results) {
    const current = map.get(row.proposal_id) ?? [];
    current.push(rowToCosponsor(row));
    map.set(row.proposal_id, current);
  }

  return map;
}

async function rowsToProposals(db: D1Database, rows: ProposalRow[]): Promise<Proposal[]> {
  const proposalIds = rows.map((row) => row.id);
  const attachments = await getAttachmentsByProposalId(db, proposalIds);
  const cosponsors = await getCosponsorsByProposalId(db, proposalIds);

  return rows.map((row) =>
    rowToProposal(row, attachments.get(row.id) ?? [], cosponsors.get(row.id) ?? []),
  );
}

function normalizeProposalInput(input: ProposalInput): NormalizedProposalInput {
  const committeeId = toPositiveInteger(input.committeeId);
  const proposerId = toPositiveInteger(input.proposerId);
  const meetingId = toPositiveInteger(input.meetingId);
  const session = parseTermCode(input.session) ?? getCurrentTerm();
  const subject = cleanString(input.subject);

  if (!committeeId) {
    throw createError({ statusCode: 400, statusMessage: '委員會為必填欄位' });
  }

  if (!session) {
    throw createError({ statusCode: 400, statusMessage: '會期為必填欄位' });
  }

  if (!proposerId) {
    throw createError({ statusCode: 400, statusMessage: '提案人為必填欄位' });
  }

  if (!meetingId) {
    throw createError({ statusCode: 400, statusMessage: '會議為必填欄位' });
  }

  if (!subject) {
    throw createError({ statusCode: 400, statusMessage: '案由為必填欄位' });
  }

  return {
    committeeId,
    session,
    proposedAt: normalizeDateTime(input.proposedAt),
    proposerId,
    meetingId,
    subject,
    description: cleanString(input.description),
    attachments: normalizeAttachments(input.attachments),
    cosponsorIds: normalizeCosponsorIds(input.cosponsorIds, proposerId),
  };
}

export function createProposalRepository(db: D1Database) {
  const deleteById = async (table: string, id: number, notFoundMessage: string) => {
    const result = await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run<{
      meta?: { changes?: number };
    }>();

    if (result?.meta?.changes === 0) {
      throw createError({ statusCode: 404, statusMessage: notFoundMessage });
    }

    return { success: true };
  };

  const createCommittee = async (input: { name?: unknown; code?: unknown }) => {
    const name = cleanString(input.name);
    const code = cleanString(input.code) || null;

    if (!name) {
      throw createError({ statusCode: 400, statusMessage: '委員會名稱為必填欄位' });
    }

    const row = await db
      .prepare(
        `INSERT INTO committees (name, code)
         VALUES (?, ?)
         RETURNING id, name, code, created_at, updated_at`,
      )
      .bind(name, code)
      .first<CommitteeRow>();

    if (!row) {
      throw createError({ statusCode: 500, statusMessage: '委員會寫入失敗' });
    }

    return rowToCommittee(row);
  };

  const updateCommittee = async (id: number, input: { name?: unknown; code?: unknown }) => {
    const name = cleanString(input.name);
    const code = cleanString(input.code) || null;

    if (!name) {
      throw createError({ statusCode: 400, statusMessage: '委員會名稱為必填欄位' });
    }

    const row = await db
      .prepare(
        `UPDATE committees
         SET name = ?,
             code = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING id, name, code, created_at, updated_at`,
      )
      .bind(name, code, id)
      .first<CommitteeRow>();

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: '找不到指定委員會' });
    }

    return rowToCommittee(row);
  };

  const deleteCommittee = (id: number) => deleteById('committees', id, '找不到指定委員會');

  const getCommittees = async () => {
    const { results = [] } = await db
      .prepare(
        `SELECT id, name, code, created_at, updated_at
         FROM committees
         ORDER BY name ASC`,
      )
      .all<CommitteeRow>();

    return results.map(rowToCommittee);
  };

  const createSession = async () => {
    const maxSession = await db
      .prepare('SELECT MAX(id) AS max_session FROM sessions')
      .first<{ max_session: number | null }>();
    const id = maxSession?.max_session
      ? getNextTermCode(maxSession.max_session)
      : getEarliestTerm();

    const defaults = getSessionDefaults(id);

    const row = await db
      .prepare(
        `INSERT INTO sessions (id, title, starts_at, ends_at)
         VALUES (?, ?, ?, ?)
         RETURNING id, title, starts_at, ends_at, created_at, updated_at`,
      )
      .bind(id, defaults.title, defaults.startsAt, defaults.endsAt)
      .first<SessionRow>();

    if (!row) {
      throw createError({ statusCode: 500, statusMessage: '會期寫入失敗' });
    }

    return rowToSession(row);
  };

  const getSessions = async () => {
    const { results = [] } = await db
      .prepare(
        `SELECT id, title, starts_at, ends_at, created_at, updated_at
         FROM sessions
         ORDER BY id DESC`,
      )
      .all<SessionRow>();

    return results.map(rowToSession);
  };

  const deleteSession = async (id: number) => {
    const session = await db
      .prepare('SELECT id, starts_at FROM sessions WHERE id = ?')
      .bind(id)
      .first<{ id: number; starts_at: string | null }>();

    if (!session) {
      throw createError({ statusCode: 404, statusMessage: '找不到指定會期' });
    }

    if (!session.starts_at || session.starts_at.slice(0, 10) <= getTaipeiDateString()) {
      throw createError({ statusCode: 400, statusMessage: '僅允許刪除未來會期' });
    }

    const references = await db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM meetings WHERE session = ?) AS meeting_count,
           (SELECT COUNT(*) FROM proposals WHERE session = ?) AS proposal_count`,
      )
      .bind(id, id)
      .first<{ meeting_count: number; proposal_count: number }>();

    if ((references?.meeting_count ?? 0) > 0 || (references?.proposal_count ?? 0) > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: '會期已有會議或議案資料，無法只刪除會期',
      });
    }

    return deleteById('sessions', id, '找不到指定會期');
  };

  const createUser = async (input: {
    name?: unknown;
    email?: unknown;
    permissionRole?: unknown;
    committeeIds?: unknown;
  }) => {
    const name = cleanString(input.name);
    const email = cleanString(input.email).toLowerCase();
    const permissionRole = cleanString(input.permissionRole) || 'viewer';
    const committeeIds = Array.isArray(input.committeeIds)
      ? [...new Set(input.committeeIds.map(toPositiveInteger))].filter((id): id is number =>
          Boolean(id),
        )
      : [];

    if (!name) {
      throw createError({ statusCode: 400, statusMessage: '姓名為必填欄位' });
    }

    if (!email) {
      throw createError({ statusCode: 400, statusMessage: 'Email 為必填欄位' });
    }

    const row = await db
      .prepare(
        `INSERT INTO users (name, email, permission_role, committee_ids)
         VALUES (?, ?, ?, ?)
         RETURNING id, name, email, permission_role, committee_ids, created_at, updated_at`,
      )
      .bind(name, email, permissionRole, JSON.stringify(committeeIds))
      .first<UserRow>();

    if (!row) {
      throw createError({ statusCode: 500, statusMessage: '人員寫入失敗' });
    }

    return rowToUser(row);
  };

  const updateUser = async (
    id: number,
    input: {
      name?: unknown;
      email?: unknown;
      permissionRole?: unknown;
      committeeIds?: unknown;
    },
  ) => {
    const name = cleanString(input.name);
    const email = cleanString(input.email).toLowerCase();
    const permissionRole = cleanString(input.permissionRole) || 'viewer';
    const committeeIds = Array.isArray(input.committeeIds)
      ? [...new Set(input.committeeIds.map(toPositiveInteger))].filter(
          (committeeId): committeeId is number => Boolean(committeeId),
        )
      : [];

    if (!name) {
      throw createError({ statusCode: 400, statusMessage: '姓名為必填欄位' });
    }

    if (!email) {
      throw createError({ statusCode: 400, statusMessage: 'Email 為必填欄位' });
    }

    const row = await db
      .prepare(
        `UPDATE users
         SET name = ?,
             email = ?,
             permission_role = ?,
             committee_ids = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING id, name, email, permission_role, committee_ids, created_at, updated_at`,
      )
      .bind(name, email, permissionRole, JSON.stringify(committeeIds), id)
      .first<UserRow>();

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: '找不到指定人員' });
    }

    return rowToUser(row);
  };

  const deleteUser = (id: number) => deleteById('users', id, '找不到指定人員');

  const getUsers = async () => {
    const { results = [] } = await db
      .prepare(
        `SELECT id, name, email, permission_role, committee_ids, created_at, updated_at
         FROM users
         ORDER BY name ASC`,
      )
      .all<UserRow>();

    return results.map(rowToUser);
  };

  const createMeeting = async (input: {
    committeeId?: unknown;
    session?: unknown;
    meetingDate?: unknown;
    proposalDeadlineAt?: unknown;
    title?: unknown;
  }) => {
    const committeeId = toPositiveInteger(input.committeeId);
    const session = parseTermCode(input.session);
    const meetingDate = normalizeDateTime(input.meetingDate, '');
    const proposalDeadlineAt = normalizeDateTime(input.proposalDeadlineAt, '');
    const title = cleanString(input.title);

    if (!session) {
      throw createError({ statusCode: 400, statusMessage: '會期為必填欄位' });
    }

    if (!meetingDate) {
      throw createError({ statusCode: 400, statusMessage: '會議日期為必填欄位' });
    }

    if (!proposalDeadlineAt) {
      throw createError({ statusCode: 400, statusMessage: '提案截止時間為必填欄位' });
    }

    if (!title) {
      throw createError({ statusCode: 400, statusMessage: '會議名稱為必填欄位' });
    }

    if (committeeId) {
      const existingCommittee = await db
        .prepare('SELECT id FROM committees WHERE id = ?')
        .bind(committeeId)
        .first<{ id: number }>();

      if (!existingCommittee) {
        throw createError({ statusCode: 400, statusMessage: '找不到指定委員會' });
      }
    }

    const existingSession = await db
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .bind(session)
      .first<{ id: number }>();

    if (!existingSession) {
      throw createError({ statusCode: 400, statusMessage: '找不到指定會期' });
    }

    const row = await db
      .prepare(
        `INSERT INTO meetings (
           committee_id,
           session,
           meeting_date,
           proposal_deadline_at,
           title
         ) VALUES (?, ?, ?, ?, ?)
         RETURNING
           id,
           committee_id,
           session,
           meeting_date,
           proposal_deadline_at,
           title,
           created_at,
           updated_at`,
      )
      .bind(committeeId, session, meetingDate, proposalDeadlineAt, title)
      .first<MeetingRow>();

    if (!row) {
      throw createError({ statusCode: 500, statusMessage: '會議寫入失敗' });
    }

    const [meeting] = (await getMeetings({ session })).filter(
      (candidate) => candidate.id === row.id,
    );
    return meeting ?? rowToMeeting(row);
  };

  const updateMeeting = async (
    id: number,
    input: {
      committeeId?: unknown;
      session?: unknown;
      meetingDate?: unknown;
      proposalDeadlineAt?: unknown;
      title?: unknown;
    },
  ) => {
    const committeeId = toPositiveInteger(input.committeeId);
    const session = parseTermCode(input.session);
    const meetingDate = normalizeDateTime(input.meetingDate, '');
    const proposalDeadlineAt = normalizeDateTime(input.proposalDeadlineAt, '');
    const title = cleanString(input.title);

    if (!session) {
      throw createError({ statusCode: 400, statusMessage: '會期為必填欄位' });
    }

    if (!meetingDate) {
      throw createError({ statusCode: 400, statusMessage: '會議日期為必填欄位' });
    }

    if (!proposalDeadlineAt) {
      throw createError({ statusCode: 400, statusMessage: '提案截止時間為必填欄位' });
    }

    if (!title) {
      throw createError({ statusCode: 400, statusMessage: '會議名稱為必填欄位' });
    }

    if (committeeId) {
      const existingCommittee = await db
        .prepare('SELECT id FROM committees WHERE id = ?')
        .bind(committeeId)
        .first<{ id: number }>();

      if (!existingCommittee) {
        throw createError({ statusCode: 400, statusMessage: '找不到指定委員會' });
      }
    }

    const existingSession = await db
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .bind(session)
      .first<{ id: number }>();

    if (!existingSession) {
      throw createError({ statusCode: 400, statusMessage: '找不到指定會期' });
    }

    const row = await db
      .prepare(
        `UPDATE meetings
         SET committee_id = ?,
             session = ?,
             meeting_date = ?,
             proposal_deadline_at = ?,
             title = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING
           id,
           committee_id,
           session,
           meeting_date,
           proposal_deadline_at,
           title,
           created_at,
           updated_at`,
      )
      .bind(committeeId, session, meetingDate, proposalDeadlineAt, title, id)
      .first<MeetingRow>();

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: '找不到指定會議' });
    }

    const [meeting] = (await getMeetings({ session })).filter(
      (candidate) => candidate.id === row.id,
    );
    return meeting ?? rowToMeeting(row);
  };

  const deleteMeeting = (id: number) => deleteById('meetings', id, '找不到指定會議');

  const getMeetings = async (filters: { committeeId?: number; session?: number } = {}) => {
    const where: string[] = [];
    const values: number[] = [];

    if (filters.committeeId) {
      where.push('meetings.committee_id = ?');
      values.push(filters.committeeId);
    }

    if (filters.session) {
      where.push('meetings.session = ?');
      values.push(filters.session);
    }

    const statement = db.prepare(
      `SELECT
         meetings.id,
         meetings.committee_id,
         committees.name AS committee_name,
         meetings.session,
         meetings.meeting_date,
         meetings.proposal_deadline_at,
         meetings.title,
         meetings.created_at,
         meetings.updated_at
       FROM meetings
       LEFT JOIN committees ON committees.id = meetings.committee_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY meetings.meeting_date ASC, meetings.id ASC`,
    );

    const prepared = values.length ? statement.bind(...values) : statement;
    const { results = [] } = await prepared.all<MeetingRow>();

    return results.map(rowToMeeting);
  };

  const getProposals = async (whereClause = '', values: (string | number)[] = []) => {
    const statement = db.prepare(
      `SELECT ${PROPOSAL_COLUMNS}
       FROM proposals
       INNER JOIN committees ON committees.id = proposals.committee_id
       INNER JOIN users AS proposers ON proposers.id = proposals.proposer_id
       INNER JOIN meetings ON meetings.id = proposals.meeting_id
       ${whereClause}
       ORDER BY proposals.proposed_at DESC, proposals.id DESC`,
    );
    const prepared = values.length ? statement.bind(...values) : statement;
    const { results = [] } = await prepared.all<ProposalRow>();

    return rowsToProposals(db, results);
  };

  const getAllBills = () => getProposals();

  const getLatestTermBills = async () => {
    const row = await db
      .prepare('SELECT MAX(session) AS latest_session FROM proposals')
      .first<{ latest_session: number | null }>();

    return row?.latest_session
      ? getProposals('WHERE proposals.session = ?', [row.latest_session])
      : [];
  };

  const getPastTermBills = async () => {
    const row = await db
      .prepare('SELECT MAX(session) AS latest_session FROM proposals')
      .first<{ latest_session: number | null }>();

    return row?.latest_session
      ? getProposals('WHERE proposals.session != ?', [row.latest_session])
      : [];
  };

  const getBillsByTerm = (targetTerm: number) =>
    getProposals('WHERE proposals.session = ?', [targetTerm]);

  const getBillById = async (targetId: number) => {
    const proposals = await getProposals('WHERE proposals.id = ?', [targetId]);
    return proposals[0];
  };

  const getBillByTermAndId = async (targetTerm: number, targetId: number) => {
    const proposals = await getProposals('WHERE proposals.session = ? AND proposals.id = ?', [
      targetTerm,
      targetId,
    ]);
    return proposals[0];
  };

  const saveBill = async (input: ProposalInput) => {
    const proposal = normalizeProposalInput(input);

    const meeting = await db
      .prepare(
        `SELECT id, committee_id, session, proposal_deadline_at
         FROM meetings
         WHERE id = ?`,
      )
      .bind(proposal.meetingId)
      .first<{
        id: number;
        committee_id: number | null;
        session: number;
        proposal_deadline_at: string;
      }>();

    if (!meeting) {
      throw createError({ statusCode: 400, statusMessage: '找不到指定會議' });
    }

    const existingSession = await db
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .bind(proposal.session)
      .first<{ id: number }>();

    if (!existingSession) {
      throw createError({ statusCode: 400, statusMessage: '找不到指定會期' });
    }

    if (
      (meeting.committee_id !== null && meeting.committee_id !== proposal.committeeId) ||
      meeting.session !== proposal.session
    ) {
      throw createError({ statusCode: 400, statusMessage: '會議與委員會或會期不相符' });
    }

    const deadline = new Date(meeting.proposal_deadline_at).getTime();
    const proposedAt = new Date(proposal.proposedAt).getTime();
    if (!Number.isNaN(deadline) && !Number.isNaN(proposedAt) && proposedAt > deadline) {
      throw createError({ statusCode: 400, statusMessage: '提案時間已超過該會議截止時間' });
    }

    const inserted = await db
      .prepare(
        `INSERT INTO proposals (
           committee_id,
           session,
           proposed_at,
           proposer_id,
           meeting_id,
           subject,
           description
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .bind(
        proposal.committeeId,
        proposal.session,
        proposal.proposedAt,
        proposal.proposerId,
        proposal.meetingId,
        proposal.subject,
        proposal.description,
      )
      .first<{ id: number }>();

    if (!inserted?.id) {
      throw createError({ statusCode: 500, statusMessage: '議案寫入失敗' });
    }

    if (proposal.attachments.length) {
      await db.batch(
        proposal.attachments.map((attachment) =>
          db
            .prepare(
              `INSERT INTO proposal_attachments (
                 proposal_id,
                 kind,
                 url,
                 r2_key,
                 filename,
                 mime_type,
                 size_bytes
               ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              inserted.id,
              attachment.kind,
              attachment.url,
              attachment.r2Key ?? null,
              attachment.filename ?? null,
              attachment.mimeType ?? null,
              attachment.sizeBytes ?? null,
            ),
        ),
      );
    }

    if (proposal.cosponsorIds.length) {
      await db.batch(
        proposal.cosponsorIds.map((userId) =>
          db
            .prepare(
              `INSERT INTO proposal_cosponsors (
                 proposal_id,
                 user_id,
                 status,
                 confirmed_at
               ) VALUES (?, ?, 'confirmed', CURRENT_TIMESTAMP)`,
            )
            .bind(inserted.id, userId),
        ),
      );
    }

    const saved = await getBillById(inserted.id);

    if (!saved) {
      throw createError({ statusCode: 500, statusMessage: '議案寫入後讀取失敗' });
    }

    return saved;
  };

  return {
    createCommittee,
    updateCommittee,
    deleteCommittee,
    getCommittees,
    createSession,
    deleteSession,
    getSessions,
    createUser,
    updateUser,
    deleteUser,
    getUsers,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    getMeetings,
    getAllBills,
    getLatestTermBills,
    getPastTermBills,
    getBillsByTerm,
    getBillById,
    getBillByTermAndId,
    saveBill,
  };
}
