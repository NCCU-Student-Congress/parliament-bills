import type { MeetingDecision } from '~~/shared/types/bill';

export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '無效的會議索引' });
  }
  const db = useD1Database(event);
  const meeting = await db.prepare('SELECT id FROM meetings WHERE id = ?').bind(id).first();
  if (!meeting) throw createError({ statusCode: 404, statusMessage: '找不到指定會議' });

  const { results = [] } = await db
    .prepare(
      `SELECT decisions.proposal_id, decisions.decision
       FROM meeting_proposal_decisions AS decisions
       INNER JOIN proposal_meetings AS scheduled
         ON scheduled.meeting_id = decisions.meeting_id
         AND scheduled.proposal_id = decisions.proposal_id
       WHERE decisions.meeting_id = ?`,
    )
    .bind(id)
    .all<{ proposal_id: number; decision: string }>();
  return results.map((row): MeetingDecision => ({
    proposalId: row.proposal_id,
    decision: row.decision,
  }));
});
