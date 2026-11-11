import { createError } from 'h3';
import type {
  Committee,
  Meeting,
  Proposal,
  ProposalAttachment,
  ProposalAttachmentInput,
  ProposalCosponsor,
  ProposalInput,
  Session,
  User,
} from '../../shared/types/bill';
import type { PermissionRole } from '../../shared/types/auth';
import { isPermissionRole } from '../../shared/types/auth';
import { getCurrentTerm, getEarliestTerm, parseTermCode } from '../../shared/utils/term';
import { normalizeAttachmentUrl } from '../../shared/utils/attachment';
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
  permission_role: PermissionRole;
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
  committee_id: number | null;
  committee_name: string | null;
  session: number;
  proposed_at: string;
  proposer_id: number;
  proposer_name: string;
  proposer_email: string;
  meeting_id: number | null;
  meeting_title: string | null;
  meeting_date: string | null;
  proposal_deadline_at: string | null;
  subject: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface AttachmentRow {
  id: number;
  proposal_id: number;
  name: string | null;
  url: string;
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
  committeeId: number | null;
  session: number;
  proposedAt: string;
  proposerId: number;
  subject: string;
  description: string;
  attachments: ProposalAttachmentInput[];
}

interface UserInput {
  name?: unknown;
  email?: unknown;
  permissionRole?: unknown;
  committeeIds?: unknown;
}

interface NormalizedUserInput {
  name: string;
  email: string;
  permissionRole: PermissionRole;
  committeeIds: number[];
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

function validateMeetingTimes(meetingDate: string, proposalDeadlineAt: string): void {
  const meetingTime = Date.parse(meetingDate);
  const deadlineTime = Date.parse(proposalDeadlineAt);

  if (!Number.isFinite(meetingTime) || !Number.isFinite(deadlineTime)) {
    throw createError({ statusCode: 400, statusMessage: '會議時間或提案截止時間格式不正確' });
  }

  if (deadlineTime > meetingTime) {
    throw createError({ statusCode: 400, statusMessage: '提案截止時間不可晚於會議時間' });
  }
}

function normalizeProposalDate(value: unknown): string {
  const date = cleanString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, statusMessage: '提案日期格式不正確' });
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw createError({ statusCode: 400, statusMessage: '提案日期不正確' });
  }

  return date;
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
    committeeName: row.committee_name ?? '無（大會）',
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
    name: row.name,
    url: row.url,
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
    committeeName: row.committee_name ?? '無（大會）',
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

function normalizeAttachments(value: unknown): ProposalAttachmentInput[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw createError({ statusCode: 400, statusMessage: '附件格式不正確' });
  }

  return value.map((item, index) => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      Object.keys(item).some((key) => key !== 'name' && key !== 'url')
    ) {
      throw createError({ statusCode: 400, statusMessage: `附件 ${index + 1} 格式不正確` });
    }

    const name = cleanString(item.name);
    const url = normalizeAttachmentUrl(item.url);
    if (!name || !url) {
      throw createError({ statusCode: 400, statusMessage: `附件 ${index + 1} 需要名稱與有效網址` });
    }

    return { name, url };
  });
}

async function getAttachmentsByProposalId(
  db: D1Database,
  proposalIds: number[],
): Promise<Map<number, ProposalAttachment[]>> {
  if (!proposalIds.length) return new Map();

  const placeholders = proposalIds.map(() => '?').join(', ');
  const { results = [] } = await db
    .prepare(
      `SELECT id, proposal_id, name, url, created_at
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
  const session = parseTermCode(input.session) ?? getCurrentTerm();
  const subject = cleanString(input.subject);

  if (!session) {
    throw createError({ statusCode: 400, statusMessage: '會期為必填欄位' });
  }

  if (!proposerId) {
    throw createError({ statusCode: 400, statusMessage: '提案人為必填欄位' });
  }

  if (!subject) {
    throw createError({ statusCode: 400, statusMessage: '案由為必填欄位' });
  }

  return {
    committeeId,
    session,
    proposedAt: normalizeDateTime(input.proposedAt),
    proposerId,
    subject,
    description: cleanString(input.description),
    attachments: normalizeAttachments(input.attachments),
  };
}

function normalizeUserInput(input: UserInput): NormalizedUserInput {
  const name = cleanString(input.name);
  const email = cleanString(input.email).toLowerCase();
  const permissionRole = cleanString(input.permissionRole) || 'legislator';
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

  if (!isPermissionRole(permissionRole)) {
    throw createError({ statusCode: 400, statusMessage: '權限角色不正確' });
  }

  return {
    name,
    email,
    permissionRole,
    committeeIds: permissionRole === 'legislator' ? committeeIds : [],
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

  const createUser = async (input: UserInput) => {
    const user = normalizeUserInput(input);

    const row = await db
      .prepare(
        `INSERT INTO users (name, email, permission_role, committee_ids)
         VALUES (?, ?, ?, ?)
         RETURNING id, name, email, permission_role, committee_ids, created_at, updated_at`,
      )
      .bind(user.name, user.email, user.permissionRole, JSON.stringify(user.committeeIds))
      .first<UserRow>();

    if (!row) {
      throw createError({ statusCode: 500, statusMessage: '人員寫入失敗' });
    }

    return rowToUser(row);
  };

  const createUsers = async (inputs: UserInput[]) => {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw createError({ statusCode: 400, statusMessage: '至少需要一筆人員資料' });
    }

    const normalizedUsers = inputs.map(normalizeUserInput);
    const inputEmailSet = new Set<string>();
    const duplicateInputEmails = new Set<string>();

    for (const user of normalizedUsers) {
      if (inputEmailSet.has(user.email)) {
        duplicateInputEmails.add(user.email);
      }
      inputEmailSet.add(user.email);
    }

    if (duplicateInputEmails.size > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `同批名單有重複 Email：${[...duplicateInputEmails].join('、')}`,
      });
    }

    const placeholders = normalizedUsers.map(() => '?').join(', ');
    const { results: existingUsers = [] } = await db
      .prepare(`SELECT email FROM users WHERE email IN (${placeholders})`)
      .bind(...normalizedUsers.map((user) => user.email))
      .all<{ email: string }>();

    if (existingUsers.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `以下 Email 已存在：${existingUsers.map((user) => user.email).join('、')}`,
      });
    }

    await db.batch(
      normalizedUsers.map((user) =>
        db
          .prepare(
            `INSERT INTO users (name, email, permission_role, committee_ids)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(user.name, user.email, user.permissionRole, JSON.stringify(user.committeeIds)),
      ),
    );

    const { results: rows = [] } = await db
      .prepare(
        `SELECT id, name, email, permission_role, committee_ids, created_at, updated_at
         FROM users
         WHERE email IN (${placeholders})`,
      )
      .bind(...normalizedUsers.map((user) => user.email))
      .all<UserRow>();
    const usersByEmail = new Map(rows.map((row) => [row.email, rowToUser(row)]));

    return normalizedUsers
      .map((user) => usersByEmail.get(user.email))
      .filter((user): user is User => Boolean(user));
  };

  const updateUser = async (id: number, input: UserInput) => {
    const user = normalizeUserInput(input);

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
      .bind(user.name, user.email, user.permissionRole, JSON.stringify(user.committeeIds), id)
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

    validateMeetingTimes(meetingDate, proposalDeadlineAt);

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

    validateMeetingTimes(meetingDate, proposalDeadlineAt);

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

    const conflictingProposal = await db
      .prepare(
        `SELECT id FROM proposals
         WHERE meeting_id = ? AND (session != ? OR committee_id IS NOT ?)
         LIMIT 1`,
      )
      .bind(id, session, committeeId)
      .first<{ id: number }>();

    if (conflictingProposal) {
      throw createError({ statusCode: 409, statusMessage: '會議已有不符合新會期或委員會的議案' });
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
       LEFT JOIN committees ON committees.id = proposals.committee_id
       INNER JOIN users AS proposers ON proposers.id = proposals.proposer_id
       LEFT JOIN meetings ON meetings.id = proposals.meeting_id
       ${whereClause}
       ORDER BY proposals.proposed_at DESC, proposals.id DESC`,
    );
    const prepared = values.length ? statement.bind(...values) : statement;
    const { results = [] } = await prepared.all<ProposalRow>();

    return rowsToProposals(db, results);
  };

  const getAllBills = () => getProposals();
  const getSignableBills = () => getProposals('WHERE proposals.meeting_id IS NULL');

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

    const existingSession = await db
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .bind(proposal.session)
      .first<{ id: number }>();

    if (!existingSession) {
      throw createError({ statusCode: 400, statusMessage: '找不到指定會期' });
    }

    if (proposal.committeeId) {
      const existingCommittee = await db
        .prepare('SELECT id FROM committees WHERE id = ?')
        .bind(proposal.committeeId)
        .first<{ id: number }>();

      if (!existingCommittee) {
        throw createError({ statusCode: 400, statusMessage: '找不到指定委員會' });
      }
    }

    const proposer = await db
      .prepare('SELECT id, permission_role FROM users WHERE id = ?')
      .bind(proposal.proposerId)
      .first<{ id: number; permission_role: string }>();

    if (!proposer) {
      throw createError({ statusCode: 400, statusMessage: '找不到指定提案人' });
    }

    if (!isPermissionRole(proposer.permission_role)) {
      throw createError({ statusCode: 400, statusMessage: '提案人身份不正確' });
    }

    const inserted = await db
      .prepare(
        `INSERT INTO proposals (
           committee_id,
           session,
           proposed_at,
           proposer_id,
           subject,
           description
         ) VALUES (?, ?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .bind(
        proposal.committeeId,
        proposal.session,
        proposal.proposedAt,
        proposal.proposerId,
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
              `INSERT INTO proposal_attachments (proposal_id, name, url)
               VALUES (?, ?, ?)`,
            )
            .bind(inserted.id, attachment.name, attachment.url),
        ),
      );
    }

    const saved = await getBillById(inserted.id);

    if (!saved) {
      throw createError({ statusCode: 500, statusMessage: '議案寫入後讀取失敗' });
    }

    return saved;
  };

  const updateBill = async (id: number, field: string, value: unknown) => {
    const current = await db
      .prepare('SELECT session, committee_id, meeting_id FROM proposals WHERE id = ?')
      .bind(id)
      .first<{ session: number; committee_id: number | null; meeting_id: number | null }>();

    if (!current) {
      throw createError({ statusCode: 404, statusMessage: '找不到指定議案' });
    }

    if (field === 'attachments') {
      const attachments = normalizeAttachments(value);
      await db.batch([
        db.prepare('UPDATE proposals SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id),
        db.prepare('DELETE FROM proposal_attachments WHERE proposal_id = ?').bind(id),
        ...attachments.map((attachment) =>
          db
            .prepare('INSERT INTO proposal_attachments (proposal_id, name, url) VALUES (?, ?, ?)')
            .bind(id, attachment.name, attachment.url),
        ),
      ]);

      const updated = await getBillById(id);
      if (!updated) {
        throw createError({ statusCode: 404, statusMessage: '找不到指定議案' });
      }
      return updated;
    }

    let column: string;
    let normalized: string | number | null;
    let changingAssignment = false;

    switch (field) {
      case 'session': {
        const session = parseTermCode(value);
        if (!session) {
          throw createError({ statusCode: 400, statusMessage: '無效的會期' });
        }
        const found = await db
          .prepare('SELECT id FROM sessions WHERE id = ?')
          .bind(session)
          .first();
        if (!found) {
          throw createError({ statusCode: 400, statusMessage: '找不到指定會期' });
        }
        column = 'session';
        normalized = session;
        changingAssignment = session !== current.session;
        break;
      }
      case 'committeeId': {
        const committeeId = value === null ? null : toPositiveInteger(value);
        if (value !== null && !committeeId) {
          throw createError({ statusCode: 400, statusMessage: '無效的委員會索引' });
        }
        if (committeeId) {
          const found = await db
            .prepare('SELECT id FROM committees WHERE id = ?')
            .bind(committeeId)
            .first();
          if (!found) {
            throw createError({ statusCode: 400, statusMessage: '找不到指定委員會' });
          }
        }
        column = 'committee_id';
        normalized = committeeId;
        changingAssignment = committeeId !== current.committee_id;
        break;
      }
      case 'proposedAt':
        column = 'proposed_at';
        normalized = normalizeProposalDate(value);
        break;
      case 'subject':
        column = 'subject';
        normalized = cleanString(value);
        if (!normalized) {
          throw createError({ statusCode: 400, statusMessage: '案由不可為空白' });
        }
        break;
      case 'description':
        if (typeof value !== 'string') {
          throw createError({ statusCode: 400, statusMessage: '說明格式不正確' });
        }
        column = 'description';
        normalized = value.trim();
        break;
      default:
        throw createError({ statusCode: 400, statusMessage: '此欄位不可編輯' });
    }

    if (changingAssignment && current.meeting_id !== null) {
      throw createError({ statusCode: 409, statusMessage: '請先到議案排案取消排入會議' });
    }

    const meetingGuard = changingAssignment ? ' AND meeting_id IS NULL' : '';
    const updated = await db
      .prepare(
        `UPDATE proposals SET ${column} = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?${meetingGuard} RETURNING id`,
      )
      .bind(normalized, id)
      .first<{ id: number }>();

    if (!updated) {
      const proposal = await getBillById(id);
      throw createError({
        statusCode: proposal ? 409 : 404,
        statusMessage: proposal ? '請先到議案排案取消排入會議' : '找不到指定議案',
      });
    }

    const proposal = await getBillById(id);
    if (!proposal) {
      throw createError({ statusCode: 404, statusMessage: '找不到指定議案' });
    }
    return proposal;
  };

  const deleteBill = async (id: number) => {
    const deleted = await db
      .prepare('DELETE FROM proposals WHERE id = ? RETURNING id')
      .bind(id)
      .first<{ id: number }>();

    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: '找不到指定議案' });
    }

    return { success: true };
  };

  const cosignBill = async (id: number, userId: number) => {
    // The proposal and user checks are part of the write so scheduling cannot race past them.
    await db
      .prepare(
        `INSERT INTO proposal_cosponsors (proposal_id, user_id, status, confirmed_at)
         SELECT proposals.id, users.id, 'confirmed', CURRENT_TIMESTAMP
         FROM proposals
         INNER JOIN users ON users.id = ?
         WHERE proposals.id = ?
           AND proposals.meeting_id IS NULL
           AND proposals.proposer_id <> users.id
           AND users.permission_role = 'legislator'
         ON CONFLICT(proposal_id, user_id) DO UPDATE SET
           status = 'confirmed',
           confirmed_at = CURRENT_TIMESTAMP,
           declined_at = NULL,
           token_hash = NULL,
           token_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE proposal_cosponsors.status <> 'confirmed'
           AND EXISTS (
             SELECT 1 FROM proposals
             WHERE proposals.id = excluded.proposal_id
               AND proposals.meeting_id IS NULL
               AND proposals.proposer_id <> excluded.user_id
           )`,
      )
      .bind(userId, id)
      .run();

    const bill = await getBillById(id);
    if (!bill) {
      throw createError({ statusCode: 404, statusMessage: '找不到指定議案' });
    }

    if (
      bill.cosponsors.some(
        (cosponsor) => cosponsor.userId === userId && cosponsor.status === 'confirmed',
      )
    ) {
      return bill;
    }

    if (bill.meetingId !== null) {
      throw createError({ statusCode: 409, statusMessage: '議案已排入會議，無法連署' });
    }

    if (bill.proposerId === userId) {
      throw createError({ statusCode: 403, statusMessage: '不能連署自己的議案' });
    }

    throw createError({ statusCode: 403, statusMessage: '沒有連署權限，請重新登入' });
  };

  const scheduleBill = async (id: number, meetingId: unknown) => {
    const proposal = await db
      .prepare('SELECT id, committee_id, session FROM proposals WHERE id = ?')
      .bind(id)
      .first<{ id: number; committee_id: number | null; session: number }>();

    if (!proposal) {
      throw createError({ statusCode: 404, statusMessage: '找不到指定議案' });
    }

    const targetMeetingId = meetingId === null ? null : toPositiveInteger(meetingId);
    if (meetingId !== null && !targetMeetingId) {
      throw createError({ statusCode: 400, statusMessage: '無效的會議索引' });
    }

    if (targetMeetingId) {
      const meeting = await db
        .prepare('SELECT committee_id, session FROM meetings WHERE id = ?')
        .bind(targetMeetingId)
        .first<{ committee_id: number | null; session: number }>();

      if (!meeting) {
        throw createError({ statusCode: 400, statusMessage: '找不到指定會議' });
      }
      if (meeting.committee_id !== proposal.committee_id || meeting.session !== proposal.session) {
        throw createError({ statusCode: 400, statusMessage: '會議與委員會或會期不相符' });
      }
    }

    await db
      .prepare('UPDATE proposals SET meeting_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(targetMeetingId, id)
      .run();

    return getBillById(id);
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
    createUsers,
    updateUser,
    deleteUser,
    getUsers,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    getMeetings,
    getAllBills,
    getSignableBills,
    getLatestTermBills,
    getPastTermBills,
    getBillsByTerm,
    getBillById,
    getBillByTermAndId,
    saveBill,
    updateBill,
    deleteBill,
    cosignBill,
    scheduleBill,
  };
}
