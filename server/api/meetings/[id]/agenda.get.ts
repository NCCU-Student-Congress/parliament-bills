import type { AgendaEntry } from '~~/shared/types/bill';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '無效的會議索引' });
  }
  const db = useD1Database(event);
  const meeting = await db.prepare('SELECT id FROM meetings WHERE id = ?').bind(id).first();
  if (!meeting)
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定會議' });

  const { results = [] } = await db
    .prepare(
      `SELECT kind, content, proposal_id, decision_key FROM meeting_agenda_entries AS entry
       WHERE meeting_id = ? AND (proposal_id IS NULL OR EXISTS (
         SELECT 1 FROM proposal_meetings
         WHERE meeting_id = entry.meeting_id AND proposal_id = entry.proposal_id
       )) ORDER BY position`,
    )
    .bind(id)
    .all<{
      kind: AgendaEntry['kind'];
      content: string;
      proposal_id: number | null;
      decision_key: string | null;
    }>();
  return results.map((row): AgendaEntry => ({
    kind: row.kind,
    content: row.content,
    proposalId: row.proposal_id,
    ...(row.decision_key ? { decisionKey: row.decision_key } : {}),
  }));
});
