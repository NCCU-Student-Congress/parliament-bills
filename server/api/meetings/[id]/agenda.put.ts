import type { AgendaEntry } from '~~/shared/types/bill';

export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '無效的會議索引' });
  }
  const db = useD1Database(event);
  const meeting = await db.prepare('SELECT id FROM meetings WHERE id = ?').bind(id).first();
  if (!meeting) throw createError({ statusCode: 404, statusMessage: '找不到指定會議' });

  const body = await readBody(event);
  if (!Array.isArray(body?.entries) || body.entries.length > 500) {
    throw createError({ statusCode: 400, statusMessage: '無效的議程內容' });
  }
  const { results: scheduled = [] } = await db
    .prepare('SELECT proposal_id FROM proposal_meetings WHERE meeting_id = ?')
    .bind(id)
    .all<{ proposal_id: number }>();
  const scheduledIds = new Set(scheduled.map((row) => row.proposal_id));
  const usedIds = new Set<number>();
  const entries: AgendaEntry[] = [];
  for (const item of body.entries) {
    if (!item || !['heading', 'text', 'proposal'].includes(item.kind)) {
      throw createError({ statusCode: 400, statusMessage: '無效的議程項目' });
    }
    if (item.kind === 'proposal') {
      if (
        !Number.isInteger(item.proposalId) ||
        !scheduledIds.has(item.proposalId) ||
        usedIds.has(item.proposalId)
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: '議程中的議案必須已排入此會議且不可重複',
        });
      }
      usedIds.add(item.proposalId);
      entries.push({ kind: 'proposal', content: '', proposalId: item.proposalId });
    } else {
      if (typeof item.content !== 'string' || !item.content.trim() || item.content.length > 10000) {
        throw createError({
          statusCode: 400,
          statusMessage: '議程文字不可為空且不可超過 10000 字',
        });
      }
      entries.push({ kind: item.kind, content: item.content.trim(), proposalId: null });
    }
  }
  if (usedIds.size !== scheduledIds.size) {
    throw createError({ statusCode: 400, statusMessage: '議程必須包含所有已排入的議案' });
  }
  await db.batch([
    db.prepare('DELETE FROM meeting_agenda_entries WHERE meeting_id = ?').bind(id),
    ...entries.map((entry, position) =>
      db
        .prepare(
          'INSERT INTO meeting_agenda_entries (meeting_id, position, kind, content, proposal_id) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(id, position, entry.kind, entry.content, entry.proposalId),
    ),
  ]);
  return entries;
});
