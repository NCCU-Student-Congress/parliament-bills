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

  const body = await readBody(event);
  if (!Array.isArray(body?.decisions) || body.decisions.length > 500) {
    throw createError({ statusCode: 400, statusMessage: '無效的決議內容' });
  }
  const { results: scheduled = [] } = await db
    .prepare('SELECT proposal_id FROM proposal_meetings WHERE meeting_id = ?')
    .bind(id)
    .all<{ proposal_id: number }>();
  const scheduledIds = new Set(scheduled.map((row) => row.proposal_id));
  const usedIds = new Set<number>();
  const decisions: MeetingDecision[] = [];
  for (const item of body.decisions) {
    if (
      !item ||
      !Number.isInteger(item.proposalId) ||
      !scheduledIds.has(item.proposalId) ||
      usedIds.has(item.proposalId) ||
      typeof item.decision !== 'string' ||
      item.decision.length > 10000
    ) {
      throw createError({ statusCode: 400, statusMessage: '決議須對應已排入的議案且不可重複' });
    }
    usedIds.add(item.proposalId);
    decisions.push({ proposalId: item.proposalId, decision: item.decision.trim() });
  }
  if (usedIds.size !== scheduledIds.size) {
    throw createError({ statusCode: 409, statusMessage: '排案已變動，請重新載入會議' });
  }
  if (decisions.length) {
    await db.batch(
      decisions.map((item) =>
        db
          .prepare(
            `INSERT INTO meeting_proposal_decisions (meeting_id, proposal_id, decision)
             VALUES (?, ?, ?)
             ON CONFLICT(meeting_id, proposal_id) DO UPDATE SET
               decision = excluded.decision, updated_at = CURRENT_TIMESTAMP`,
          )
          .bind(id, item.proposalId, item.decision),
      ),
    );
  }
  return decisions;
});
