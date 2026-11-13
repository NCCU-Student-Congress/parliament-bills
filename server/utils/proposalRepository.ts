import { createError } from 'h3';
import type {
  Committee,
  Meeting,
  ProposalMeeting,
  Proposal,
  ProposalAttachment,
  ProposalAttachmentInput,
  ProposalCosponsor,
  ProposalInput,
  ProposalType,
  ScheduledMeeting,
  Session,
  User,
} from '../../shared/types/bill';
import { isProposalType } from '../../shared/types/bill';
import type { PermissionRole } from '../../shared/types/auth';
import { isPermissionRole } from '../../shared/types/auth';
import { getCurrentTerm, getEarliestTerm, parseTermCode } from '../../shared/utils/term';
import { normalizeAttachmentUrl } from '../../shared/utils/attachment';
import { renderProposalText } from '../../shared/utils/proposalText';
import type { D1Database, D1PreparedStatement } from './d1';

interface CommitteeRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  permission_role: PermissionRole;
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
  meeting_type_name: string;
  session: number;
  meeting_date: string;
  proposal_deadline_at: string;
  title: string;
  location: string;
  created_at: string;
  updated_at: string;
}

interface ProposalRow {
  id: number;
  proposal_type: ProposalType;
  committee_id: number | null;
  committee_name: string | null;
  session: number;
  proposed_at: string;
  proposer_id: number;
  proposer_name: string;
  subject: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface AttachmentRow {
  id: number;
  proposal_id: number;
  name: string;
  url: string;
  created_at: string;
}

interface ProposalMeetingRow {
  proposal_id: number;
  id: number;
  title: string;
  meeting_date: string;
  proposal_deadline_at: string;
  location: string;
}

interface CosponsorRow {
  proposal_id: number;
  user_id: number;
  user_name: string;
  signed_at: string | null;
}

interface NormalizedProposalInput {
  proposalType: ProposalType;
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
  proposals.proposal_type,
  proposals.committee_id,
  committees.name AS committee_name,
  proposals.session,
  proposals.proposed_at,
  proposals.proposer_id,
  proposers.name AS proposer_name,
  proposals.subject,
  proposals.description,
  proposals.created_at,
  proposals.updated_at
`;

const MAX_SUBJECT_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 20000;
const MAX_ATTACHMENTS = 20;
const MAX_ATTACHMENT_NAME_LENGTH = 200;
const MAX_ATTACHMENT_URL_LENGTH = 2048;

function assertMaxLength(value: string, max: number, label: string): void {
  if (value.length > max) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `${label}不可超過 ${max} 字`,
    });
  }
}

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
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: '會議時間或提案截止時間格式不正確',
    });
  }

  if (deadlineTime > meetingTime) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: '提案截止時間不可晚於會議時間',
    });
  }
}

function normalizeProposalDate(value: unknown): string {
  const date = cleanString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: '提案日期格式不正確',
    });
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '提案日期不正確' });
  }

  return date;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToUser(row: UserRow, committeeIds: number[]): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    permissionRole: row.permission_role,
    committeeIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function rowsToUsers(db: D1Database, rows: UserRow[]): Promise<User[]> {
  if (!rows.length) return [];
  const placeholders = rows.map(() => '?').join(', ');
  const { results: memberships = [] } = await db
    .prepare(
      `SELECT user_id, committee_id FROM user_committees
       WHERE user_id IN (${placeholders}) ORDER BY committee_id ASC`,
    )
    .bind(...rows.map((row) => row.id))
    .all<{ user_id: number; committee_id: number }>();
  const committeeIdsByUser = new Map<number, number[]>();
  for (const membership of memberships) {
    const ids = committeeIdsByUser.get(membership.user_id) ?? [];
    ids.push(membership.committee_id);
    committeeIdsByUser.set(membership.user_id, ids);
  }
  return rows.map((row) => rowToUser(row, committeeIdsByUser.get(row.id) ?? []));
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
    meetingTypeName: row.meeting_type_name,
    session: row.session,
    meetingDate: row.meeting_date,
    proposalDeadlineAt: row.proposal_deadline_at,
    title: row.title,
    location: row.location,
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
    proposalId: row.proposal_id,
    userId: row.user_id,
    userName: row.user_name,
    signedAt: row.signed_at,
  };
}

function rowToProposal(
  row: ProposalRow,
  attachments: ProposalAttachment[],
  cosponsors: ProposalCosponsor[],
  meetings: ProposalMeeting[],
): Proposal {
  return {
    id: row.id,
    proposalType: row.proposal_type,
    committeeId: row.committee_id,
    committeeName: row.committee_name ?? '無（大會）',
    session: row.session,
    proposedAt: row.proposed_at,
    proposerId: row.proposer_id,
    proposerName: row.proposer_name,
    meetings,
    subject: renderProposalText(row.subject, cosponsors),
    description: renderProposalText(row.description, cosponsors),
    subjectTemplate: row.subject,
    descriptionTemplate: row.description,
    attachments,
    cosponsors,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeAttachments(value: unknown): ProposalAttachmentInput[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '附件格式不正確' });
  }

  if (value.length > MAX_ATTACHMENTS) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `附件不可超過 ${MAX_ATTACHMENTS} 個`,
    });
  }

  const attachments = value.map((item, index) => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      Object.keys(item).some((key) => key !== 'name' && key !== 'url')
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `附件 ${index + 1} 格式不正確`,
      });
    }

    const name = cleanString(item.name);
    const url = normalizeAttachmentUrl(item.url);
    if (!name || !url) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `附件 ${index + 1} 需要名稱與有效網址`,
      });
    }
    assertMaxLength(name, MAX_ATTACHMENT_NAME_LENGTH, `附件 ${index + 1} 名稱`);
    assertMaxLength(url, MAX_ATTACHMENT_URL_LENGTH, `附件 ${index + 1} 網址`);

    return { name, url };
  });
  if (new Set(attachments.map((attachment) => attachment.url)).size !== attachments.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: '附件網址不可重複',
    });
  }
  return attachments;
}

// The proposals a lookup returns, as SQL for `proposal_id IN (...)`. Child rows are selected by
// this subquery rather than by a list of ids, so all four reads fit in one batch and no list can
// exceed D1's limit on bound parameters.
interface ProposalIdSource {
  sql: string;
  values: (string | number)[];
}

function bindValues(statement: D1PreparedStatement, values: (string | number)[]) {
  return values.length ? statement.bind(...values) : statement;
}

function groupByProposal<Row extends { proposal_id: number }, Item>(
  rows: Row[],
  toItem: (row: Row) => Item,
) {
  const map = new Map<number, Item[]>();
  for (const row of rows) {
    const current = map.get(row.proposal_id) ?? [];
    current.push(toItem(row));
    map.set(row.proposal_id, current);
  }
  return map;
}

function attachmentsStatement(db: D1Database, ids: ProposalIdSource) {
  return bindValues(
    db.prepare(
      `SELECT id, proposal_id, name, url, created_at
       FROM proposal_attachments
       WHERE proposal_id IN (${ids.sql})
       ORDER BY id ASC`,
    ),
    ids.values,
  );
}

function cosponsorsStatement(db: D1Database, ids: ProposalIdSource) {
  return bindValues(
    db.prepare(
      `SELECT
         proposal_cosponsors.proposal_id,
         proposal_cosponsors.user_id,
         users.name AS user_name,
         proposal_cosponsors.signed_at
       FROM proposal_cosponsors
       INNER JOIN users ON users.id = proposal_cosponsors.user_id
       WHERE proposal_cosponsors.proposal_id IN (${ids.sql})
       ORDER BY proposal_cosponsors.signed_at ASC, proposal_cosponsors.user_id ASC`,
    ),
    ids.values,
  );
}

function meetingsStatement(db: D1Database, ids: ProposalIdSource) {
  return bindValues(
    db.prepare(
      `SELECT proposal_meetings.proposal_id, meetings.id, meetings.title,
              meetings.meeting_date, meetings.proposal_deadline_at, meetings.location
       FROM proposal_meetings
       INNER JOIN meetings ON meetings.id = proposal_meetings.meeting_id
       WHERE proposal_meetings.proposal_id IN (${ids.sql})
       ORDER BY meetings.meeting_date ASC, meetings.id ASC`,
    ),
    ids.values,
  );
}

function rowToProposalMeeting(row: ProposalMeetingRow): ProposalMeeting {
  return {
    id: row.id,
    title: row.title,
    meetingDate: row.meeting_date,
    proposalDeadlineAt: row.proposal_deadline_at,
    location: row.location,
  };
}

function normalizeProposalInput(input: ProposalInput): NormalizedProposalInput {
  const proposalType = input.proposalType === undefined ? 'discussion' : input.proposalType;
  const committeeId = toPositiveInteger(input.committeeId);
  const proposerId = toPositiveInteger(input.proposerId);
  const session = parseTermCode(input.session) ?? getCurrentTerm();
  const subject = cleanString(input.subject);

  if (!session) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '會期為必填欄位' });
  }

  if (!proposerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: '提案人為必填欄位',
    });
  }

  if (!subject) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '案由為必填欄位' });
  }

  assertMaxLength(subject, MAX_SUBJECT_LENGTH, '案由');

  if (!isProposalType(proposalType)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '案型不正確' });
  }

  const description = cleanString(input.description);
  assertMaxLength(description, MAX_DESCRIPTION_LENGTH, '說明');

  return {
    proposalType,
    committeeId,
    session,
    proposedAt:
      input.proposedAt == null || input.proposedAt === ''
        ? getTaipeiDateString()
        : normalizeProposalDate(input.proposedAt),
    proposerId,
    subject,
    description,
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
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '姓名為必填欄位' });
  }

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Email 為必填欄位',
    });
  }

  if (!isPermissionRole(permissionRole)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '權限角色不正確' });
  }

  return {
    name,
    email,
    permissionRole,
    committeeIds: permissionRole === 'legislator' ? committeeIds : [],
  };
}

export function createProposalRepository(db: D1Database) {
  const validateCommitteeIds = async (committeeIds: number[]) => {
    if (!committeeIds.length) return;
    const placeholders = committeeIds.map(() => '?').join(', ');
    const { results = [] } = await db
      .prepare(`SELECT id FROM committees WHERE id IN (${placeholders})`)
      .bind(...committeeIds)
      .all<{ id: number }>();
    if (results.length !== committeeIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '找不到指定委員會',
      });
    }
  };

  const deleteById = async (table: string, id: number, notFoundMessage: string) => {
    const result = await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run<{
      meta?: { changes?: number };
    }>();

    if (result?.meta?.changes === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: notFoundMessage });
    }

    return { success: true };
  };

  const createCommittee = async (input: { name?: unknown }) => {
    const name = cleanString(input.name);

    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '委員會名稱為必填欄位',
      });
    }

    const row = await db
      .prepare(
        `INSERT INTO committees (name)
         VALUES (?)
         RETURNING id, name, created_at, updated_at`,
      )
      .bind(name)
      .first<CommitteeRow>();

    if (!row) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: '委員會寫入失敗',
      });
    }

    return rowToCommittee(row);
  };

  const updateCommittee = async (id: number, input: { name?: unknown }) => {
    const name = cleanString(input.name);

    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '委員會名稱為必填欄位',
      });
    }

    const row = await db
      .prepare(
        `UPDATE committees
         SET name = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING id, name, created_at, updated_at`,
      )
      .bind(name, id)
      .first<CommitteeRow>();

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: '找不到指定委員會',
      });
    }

    return rowToCommittee(row);
  };

  const deleteCommittee = (id: number) => deleteById('committees', id, '找不到指定委員會');

  const getCommittees = async () => {
    const { results = [] } = await db
      .prepare(
        `SELECT id, name, created_at, updated_at
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
      .bind(id, defaults.title, defaults.startsAt ?? null, defaults.endsAt ?? null)
      .first<SessionRow>();

    if (!row) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: '會期寫入失敗',
      });
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
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定會期' });
    }

    if (!session.starts_at || session.starts_at.slice(0, 10) <= getTaipeiDateString()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '僅允許刪除未來會期',
      });
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
        statusMessage: 'Conflict',
        message: '會期已有會議或議案資料，無法只刪除會期',
      });
    }

    return deleteById('sessions', id, '找不到指定會期');
  };

  const createUser = async (input: UserInput) => {
    const user = normalizeUserInput(input);
    await validateCommitteeIds(user.committeeIds);
    await db.batch([
      db
        .prepare('INSERT INTO users (name, email, permission_role) VALUES (?, ?, ?)')
        .bind(user.name, user.email, user.permissionRole),
      ...user.committeeIds.map((committeeId) =>
        db
          .prepare(
            `INSERT INTO user_committees (user_id, committee_id)
             SELECT id, ? FROM users WHERE email = ?`,
          )
          .bind(committeeId, user.email),
      ),
    ]);
    const row = await db
      .prepare(
        'SELECT id, name, email, permission_role, created_at, updated_at FROM users WHERE email = ?',
      )
      .bind(user.email)
      .first<UserRow>();
    if (!row) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: '人員寫入失敗',
      });
    }

    return (await rowsToUsers(db, [row]))[0]!;
  };

  const createUsers = async (inputs: UserInput[]) => {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '至少需要一筆人員資料',
      });
    }

    const normalizedUsers = inputs.map(normalizeUserInput);
    await validateCommitteeIds([...new Set(normalizedUsers.flatMap((user) => user.committeeIds))]);
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
        statusMessage: 'Bad Request',
        message: `同批名單有重複 Email：${[...duplicateInputEmails].join('、')}`,
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
        statusMessage: 'Conflict',
        message: `以下 Email 已存在：${existingUsers.map((user) => user.email).join('、')}`,
      });
    }

    await db.batch(
      normalizedUsers.flatMap((user) => [
        db
          .prepare('INSERT INTO users (name, email, permission_role) VALUES (?, ?, ?)')
          .bind(user.name, user.email, user.permissionRole),
        ...user.committeeIds.map((committeeId) =>
          db
            .prepare(
              `INSERT INTO user_committees (user_id, committee_id)
               SELECT id, ? FROM users WHERE email = ?`,
            )
            .bind(committeeId, user.email),
        ),
      ]),
    );

    const { results: rows = [] } = await db
      .prepare(
        `SELECT id, name, email, permission_role, created_at, updated_at
         FROM users
         WHERE email IN (${placeholders})`,
      )
      .bind(...normalizedUsers.map((user) => user.email))
      .all<UserRow>();
    const usersByEmail = new Map((await rowsToUsers(db, rows)).map((user) => [user.email, user]));

    return normalizedUsers
      .map((user) => usersByEmail.get(user.email))
      .filter((user): user is User => Boolean(user));
  };

  const updateUser = async (id: number, input: UserInput) => {
    const user = normalizeUserInput(input);
    await validateCommitteeIds(user.committeeIds);
    const existing = await db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定人員' });
    }
    await db.batch([
      db
        .prepare(
          `UPDATE users
         SET name = ?,
             email = ?,
             permission_role = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        )
        .bind(user.name, user.email, user.permissionRole, id),
      db.prepare('DELETE FROM user_committees WHERE user_id = ?').bind(id),
      ...user.committeeIds.map((committeeId) =>
        db
          .prepare('INSERT INTO user_committees (user_id, committee_id) VALUES (?, ?)')
          .bind(id, committeeId),
      ),
    ]);
    const row = await db
      .prepare(
        'SELECT id, name, email, permission_role, created_at, updated_at FROM users WHERE id = ?',
      )
      .bind(id)
      .first<UserRow>();

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定人員' });
    }

    return (await rowsToUsers(db, [row]))[0]!;
  };

  const deleteUser = (id: number) => deleteById('users', id, '找不到指定人員');

  const getUsers = async () => {
    const { results = [] } = await db
      .prepare(
        `SELECT id, name, email, permission_role, created_at, updated_at
         FROM users
         ORDER BY name ASC`,
      )
      .all<UserRow>();

    return rowsToUsers(db, results);
  };

  const createMeeting = async (input: {
    committeeId?: unknown;
    session?: unknown;
    meetingDate?: unknown;
    proposalDeadlineAt?: unknown;
    title?: unknown;
    location?: unknown;
  }) => {
    const committeeId = toPositiveInteger(input.committeeId);
    const session = parseTermCode(input.session);
    const meetingDate = normalizeDateTime(input.meetingDate, '');
    const proposalDeadlineAt = normalizeDateTime(input.proposalDeadlineAt, '');
    const title = cleanString(input.title);
    const location = cleanString(input.location);
    let meetingTypeName = '大會';

    if (!session) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '會期為必填欄位',
      });
    }

    if (!meetingDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '會議日期為必填欄位',
      });
    }

    if (!proposalDeadlineAt) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '提案截止時間為必填欄位',
      });
    }

    validateMeetingTimes(meetingDate, proposalDeadlineAt);

    if (!title) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '會議名稱為必填欄位',
      });
    }

    if (committeeId) {
      const existingCommittee = await db
        .prepare('SELECT name FROM committees WHERE id = ?')
        .bind(committeeId)
        .first<{ name: string }>();

      if (!existingCommittee) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: '找不到指定委員會',
        });
      }
      meetingTypeName = existingCommittee.name;
    }

    const existingSession = await db
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .bind(session)
      .first<{ id: number }>();

    if (!existingSession) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '找不到指定會期',
      });
    }

    const row = await db
      .prepare(
        `INSERT INTO meetings (
           committee_id,
           meeting_type_name,
           session,
           meeting_date,
           proposal_deadline_at,
           title,
           location
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING
           id,
           committee_id,
           meeting_type_name,
           session,
           meeting_date,
           proposal_deadline_at,
           title,
           location,
           created_at,
           updated_at`,
      )
      .bind(committeeId, meetingTypeName, session, meetingDate, proposalDeadlineAt, title, location)
      .first<MeetingRow>();

    if (!row) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: '會議寫入失敗',
      });
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
      location?: unknown;
    },
  ) => {
    const committeeId = toPositiveInteger(input.committeeId);
    const session = parseTermCode(input.session);
    const meetingDate = normalizeDateTime(input.meetingDate, '');
    const proposalDeadlineAt = normalizeDateTime(input.proposalDeadlineAt, '');
    const title = cleanString(input.title);
    const location = cleanString(input.location);
    let selectedCommitteeName: string | null = null;

    if (!session) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '會期為必填欄位',
      });
    }

    if (!meetingDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '會議日期為必填欄位',
      });
    }

    if (!proposalDeadlineAt) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '提案截止時間為必填欄位',
      });
    }

    validateMeetingTimes(meetingDate, proposalDeadlineAt);

    if (!title) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '會議名稱為必填欄位',
      });
    }

    if (committeeId) {
      const existingCommittee = await db
        .prepare('SELECT name FROM committees WHERE id = ?')
        .bind(committeeId)
        .first<{ name: string }>();

      if (!existingCommittee) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: '找不到指定委員會',
        });
      }
      selectedCommitteeName = existingCommittee.name;
    }

    const existingSession = await db
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .bind(session)
      .first<{ id: number }>();

    if (!existingSession) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '找不到指定會期',
      });
    }

    const currentMeeting = await db
      .prepare('SELECT committee_id, meeting_type_name FROM meetings WHERE id = ?')
      .bind(id)
      .first<{ committee_id: number | null; meeting_type_name: string }>();
    if (!currentMeeting) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定會議' });
    }
    const meetingTypeName =
      committeeId === currentMeeting.committee_id
        ? currentMeeting.meeting_type_name
        : (selectedCommitteeName ?? '大會');

    const conflictingProposal = await db
      .prepare(
        `SELECT proposals.id FROM proposals
         INNER JOIN proposal_meetings ON proposal_meetings.proposal_id = proposals.id
         WHERE proposal_meetings.meeting_id = ? AND (proposals.session != ? OR proposals.committee_id IS NOT ?)
         LIMIT 1`,
      )
      .bind(id, session, committeeId)
      .first<{ id: number }>();

    if (conflictingProposal) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: '會議已有不符合新會期或委員會的議案',
      });
    }

    const row = await db
      .prepare(
        `UPDATE meetings
         SET committee_id = ?,
             meeting_type_name = ?,
             session = ?,
             meeting_date = ?,
             proposal_deadline_at = ?,
             title = ?,
             location = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING
           id,
           committee_id,
           meeting_type_name,
           session,
           meeting_date,
           proposal_deadline_at,
           title,
           location,
           created_at,
           updated_at`,
      )
      .bind(
        committeeId,
        meetingTypeName,
        session,
        meetingDate,
        proposalDeadlineAt,
        title,
        location,
        id,
      )
      .first<MeetingRow>();

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定會議' });
    }

    const [meeting] = (await getMeetings({ session })).filter(
      (candidate) => candidate.id === row.id,
    );
    return meeting ?? rowToMeeting(row);
  };

  const deleteMeeting = async (id: number) => {
    const assigned = await db
      .prepare('SELECT 1 FROM proposal_meetings WHERE meeting_id = ? LIMIT 1')
      .bind(id)
      .first();
    if (assigned)
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: '會議已有排入議案，請先取消排案',
      });
    return deleteById('meetings', id, '找不到指定會議');
  };

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
         meetings.meeting_type_name,
         meetings.session,
         meetings.meeting_date,
         meetings.proposal_deadline_at,
         meetings.title,
         meetings.location,
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

  const getScheduledMeetings = async (session?: number): Promise<ScheduledMeeting[]> => {
    const [meetings, { results = [] }] = await Promise.all([
      getMeetings(session ? { session } : {}),
      db
        .prepare(
          `SELECT proposal_meetings.meeting_id, COUNT(*) AS proposal_count
           FROM proposal_meetings
           GROUP BY proposal_meetings.meeting_id`,
        )
        .all<{ meeting_id: number; proposal_count: number }>(),
    ]);
    const counts = new Map(results.map((row) => [row.meeting_id, row.proposal_count]));
    return meetings.map((meeting) => ({ ...meeting, proposalCount: counts.get(meeting.id) ?? 0 }));
  };

  // whereClause may only refer to the proposals table, since it also filters the child queries.
  const getProposals = async (whereClause = '', values: (string | number)[] = []) => {
    const ids = { sql: `SELECT proposals.id FROM proposals ${whereClause}`, values };
    // One batch is one D1 round trip, and every table is read from the same snapshot.
    const [proposalRows, attachmentRows, cosponsorRows, meetingRows] = await db.batch<{
      results?: unknown[];
    }>([
      bindValues(
        db.prepare(
          `SELECT ${PROPOSAL_COLUMNS}
           FROM proposals
           LEFT JOIN committees ON committees.id = proposals.committee_id
           INNER JOIN users AS proposers ON proposers.id = proposals.proposer_id
           ${whereClause}
           ORDER BY proposals.proposed_at DESC, proposals.id DESC`,
        ),
        values,
      ),
      attachmentsStatement(db, ids),
      cosponsorsStatement(db, ids),
      meetingsStatement(db, ids),
    ]);
    const attachments = groupByProposal(
      (attachmentRows?.results ?? []) as AttachmentRow[],
      rowToAttachment,
    );
    const cosponsors = groupByProposal(
      (cosponsorRows?.results ?? []) as CosponsorRow[],
      rowToCosponsor,
    );
    const meetings = groupByProposal(
      (meetingRows?.results ?? []) as ProposalMeetingRow[],
      rowToProposalMeeting,
    );

    return ((proposalRows?.results ?? []) as ProposalRow[]).map((row) =>
      rowToProposal(
        row,
        attachments.get(row.id) ?? [],
        cosponsors.get(row.id) ?? [],
        meetings.get(row.id) ?? [],
      ),
    );
  };

  const getAllBills = () => getProposals();
  const getSignableBills = () =>
    getProposals(
      "WHERE NOT EXISTS (SELECT 1 FROM proposal_meetings WHERE proposal_id = proposals.id) AND proposals.proposal_type <> 'report'",
    );

  const getBillsByMeeting = (meetingId: number) =>
    getProposals(
      `WHERE EXISTS (
         SELECT 1 FROM proposal_meetings
         WHERE proposal_meetings.proposal_id = proposals.id
           AND proposal_meetings.meeting_id = ?
       )`,
      [meetingId],
    );

  const getBillById = async (targetId: number) => {
    const proposals = await getProposals('WHERE proposals.id = ?', [targetId]);
    return proposals[0];
  };

  const saveBill = async (input: ProposalInput) => {
    const proposal = normalizeProposalInput(input);

    const existingSession = await db
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .bind(proposal.session)
      .first<{ id: number }>();

    if (!existingSession) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '找不到指定會期',
      });
    }

    if (proposal.committeeId) {
      const existingCommittee = await db
        .prepare('SELECT id FROM committees WHERE id = ?')
        .bind(proposal.committeeId)
        .first<{ id: number }>();

      if (!existingCommittee) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: '找不到指定委員會',
        });
      }
    }

    const proposer = await db
      .prepare('SELECT id, permission_role FROM users WHERE id = ?')
      .bind(proposal.proposerId)
      .first<{ id: number; permission_role: string }>();

    if (!proposer) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '找不到指定提案人',
      });
    }

    if (!isPermissionRole(proposer.permission_role)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '提案人身份不正確',
      });
    }

    const inserted = await db
      .prepare(
        `INSERT INTO proposals (
           proposal_type,
           committee_id,
           session,
           proposed_at,
           proposer_id,
           subject,
           description
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .bind(
        proposal.proposalType,
        proposal.committeeId,
        proposal.session,
        proposal.proposedAt,
        proposal.proposerId,
        proposal.subject,
        proposal.description,
      )
      .first<{ id: number }>();

    if (!inserted?.id) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: '議案寫入失敗',
      });
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
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: '議案寫入後讀取失敗',
      });
    }

    return saved;
  };

  const updateBill = async (id: number, field: string, value: unknown) => {
    const current = await db
      .prepare('SELECT session, committee_id FROM proposals WHERE id = ?')
      .bind(id)
      .first<{ session: number; committee_id: number | null }>();

    if (!current) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定議案' });
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
        throw createError({
          statusCode: 404,
          statusMessage: 'Not Found',
          message: '找不到指定議案',
        });
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
          throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: '無效的會期',
          });
        }
        const found = await db
          .prepare('SELECT id FROM sessions WHERE id = ?')
          .bind(session)
          .first();
        if (!found) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: '找不到指定會期',
          });
        }
        column = 'session';
        normalized = session;
        changingAssignment = session !== current.session;
        break;
      }
      case 'committeeId': {
        const committeeId = value === null ? null : toPositiveInteger(value);
        if (value !== null && !committeeId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: '無效的委員會索引',
          });
        }
        if (committeeId) {
          const found = await db
            .prepare('SELECT id FROM committees WHERE id = ?')
            .bind(committeeId)
            .first();
          if (!found) {
            throw createError({
              statusCode: 400,
              statusMessage: 'Bad Request',
              message: '找不到指定委員會',
            });
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
          throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: '案由不可為空白',
          });
        }
        assertMaxLength(normalized, MAX_SUBJECT_LENGTH, '案由');
        break;
      case 'description':
        if (typeof value !== 'string') {
          throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: '說明格式不正確',
          });
        }
        column = 'description';
        normalized = value.trim();
        assertMaxLength(normalized, MAX_DESCRIPTION_LENGTH, '說明');
        break;
      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: '此欄位不可編輯',
        });
    }

    if (
      changingAssignment &&
      (await db
        .prepare('SELECT 1 FROM proposal_meetings WHERE proposal_id = ? LIMIT 1')
        .bind(id)
        .first())
    ) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: '請先到議案排案取消排入會議',
      });
    }

    const meetingGuard = changingAssignment
      ? ' AND NOT EXISTS (SELECT 1 FROM proposal_meetings WHERE proposal_id = proposals.id)'
      : '';
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
        statusMessage: proposal ? 'Conflict' : 'Not Found',
        message: proposal ? '請先到議案排案取消排入會議' : '找不到指定議案',
      });
    }

    const proposal = await getBillById(id);
    if (!proposal) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定議案' });
    }
    return proposal;
  };

  const deleteBill = async (id: number) => {
    const deleted = await db
      .prepare('DELETE FROM proposals WHERE id = ? RETURNING id')
      .bind(id)
      .first<{ id: number }>();

    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定議案' });
    }

    return { success: true };
  };

  const cosignBill = async (id: number, userId: number) => {
    // The proposal and user checks are part of the write so scheduling cannot race past them.
    await db
      .prepare(
        `INSERT INTO proposal_cosponsors (proposal_id, user_id, signed_at)
         SELECT proposals.id, users.id, CURRENT_TIMESTAMP
         FROM proposals
         INNER JOIN users ON users.id = ?
         WHERE proposals.id = ?
           AND NOT EXISTS (SELECT 1 FROM proposal_meetings WHERE proposal_id = proposals.id)
           AND proposals.proposal_type <> 'report'
           AND proposals.proposer_id <> users.id
           AND users.permission_role = 'legislator'
         ON CONFLICT(proposal_id, user_id) DO NOTHING`,
      )
      .bind(userId, id)
      .run();

    const bill = await getBillById(id);
    if (!bill) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定議案' });
    }

    if (bill.proposalType === 'report') {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: '報告案不可連署' });
    }

    if (bill.cosponsors.some((cosponsor) => cosponsor.userId === userId)) {
      return bill;
    }

    if (bill.meetings.length) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: '議案已排入會議，無法連署',
      });
    }

    if (bill.proposerId === userId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: '不能連署自己的議案',
      });
    }

    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: '沒有連署權限，請重新登入',
    });
  };

  const scheduleBill = async (id: number, meetingIds: unknown) => {
    const proposal = await db
      .prepare('SELECT id, committee_id, session FROM proposals WHERE id = ?')
      .bind(id)
      .first<{ id: number; committee_id: number | null; session: number }>();

    if (!proposal) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定議案' });
    }

    if (!Array.isArray(meetingIds) || meetingIds.some((value) => !toPositiveInteger(value))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: '無效的會議索引',
      });
    }
    const targetMeetingIds = [
      ...new Set(meetingIds.map((value) => toPositiveInteger(value) as number)),
    ];

    for (const targetMeetingId of targetMeetingIds) {
      const meeting = await db
        .prepare('SELECT committee_id, session FROM meetings WHERE id = ?')
        .bind(targetMeetingId)
        .first<{ committee_id: number | null; session: number }>();

      if (!meeting) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: '找不到指定會議',
        });
      }
      if (meeting.committee_id !== proposal.committee_id || meeting.session !== proposal.session) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: '會議與委員會或會期不相符',
        });
      }
    }

    await db.batch([
      db.prepare('DELETE FROM proposal_meetings WHERE proposal_id = ?').bind(id),
      ...targetMeetingIds.map((meetingId) =>
        db
          .prepare('INSERT INTO proposal_meetings (proposal_id, meeting_id) VALUES (?, ?)')
          .bind(id, meetingId),
      ),
      db.prepare('UPDATE proposals SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id),
    ]);

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
    getScheduledMeetings,
    getAllBills,
    getSignableBills,
    getBillsByMeeting,
    getBillById,
    saveBill,
    updateBill,
    deleteBill,
    cosignBill,
    scheduleBill,
  };
}
