import type { MeetingDecision, MeetingMinutes } from '~~/shared/types/bill';

export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '無效的會議索引' });
  }
  const db = useD1Database(event);
  const meeting = await db
    .prepare('SELECT closing_time FROM meetings WHERE id = ?')
    .bind(id)
    .first<{ closing_time: string }>();
  if (!meeting)
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '找不到指定會議' });

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
        `SELECT decision_key, decision FROM meeting_agenda_entries
         WHERE meeting_id = ? AND kind = 'text' AND decision IS NOT NULL`,
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
  return { decisions, closingTime: meeting.closing_time } satisfies MeetingMinutes;
});
