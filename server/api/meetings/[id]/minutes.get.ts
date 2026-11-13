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

  const [proposalRows, textRows] = await Promise.all([
    db
      .prepare(
        `SELECT decisions.proposal_id, decisions.decision
         FROM meeting_proposal_decisions AS decisions
         INNER JOIN proposal_meetings AS scheduled
           ON scheduled.meeting_id = decisions.meeting_id
           AND scheduled.proposal_id = decisions.proposal_id
         WHERE decisions.meeting_id = ?`,
      )
      .bind(id)
      .all<{ proposal_id: number; decision: string }>(),
    db
      .prepare(
        `SELECT decisions.decision_key, decisions.decision
         FROM meeting_text_decisions AS decisions
         INNER JOIN meeting_agenda_entries AS entry
           ON entry.meeting_id = decisions.meeting_id
           AND entry.decision_key = decisions.decision_key
           AND entry.kind = 'text'
         WHERE decisions.meeting_id = ?`,
      )
      .bind(id)
      .all<{ decision_key: string; decision: string }>(),
  ]);
  const decisions: MeetingDecision[] = [
    ...(proposalRows.results ?? []).map((row) => ({
      proposalId: row.proposal_id,
      decision: row.decision,
    })),
    ...(textRows.results ?? []).map((row) => ({
      decisionKey: row.decision_key,
      decision: row.decision,
    })),
  ];
  return decisions;
});
