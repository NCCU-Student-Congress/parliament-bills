import type { MeetingDecision } from '~~/shared/types/bill';

export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: '無效的會議索引' });
  }
  const db = useD1Database(event);
  const meeting = await db.prepare('SELECT id FROM meetings WHERE id = ?').bind(id).first();
  if (!meeting) throw createError({ statusCode: 404, message: '找不到指定會議' });

  const body = await readBody(event);
  if (!Array.isArray(body?.decisions) || body.decisions.length > 500) {
    throw createError({ statusCode: 400, message: '無效的決議內容' });
  }
  const { results: scheduled = [] } = await db
    .prepare('SELECT proposal_id FROM proposal_meetings WHERE meeting_id = ?')
    .bind(id)
    .all<{ proposal_id: number }>();
  const scheduledIds = new Set(scheduled.map((row) => row.proposal_id));
  const { results: textEntries = [] } = await db
    .prepare(
      "SELECT decision_key FROM meeting_agenda_entries WHERE meeting_id = ? AND kind = 'text'",
    )
    .bind(id)
    .all<{ decision_key: string }>();
  const textKeys = new Set(textEntries.map((row) => row.decision_key));
  const usedIds = new Set<number>();
  const usedKeys = new Set<string>();
  const decisions: MeetingDecision[] = [];
  for (const item of body.decisions) {
    if (!item || typeof item.decision !== 'string' || item.decision.length > 10000) {
      throw createError({ statusCode: 400, message: '無效的決議內容' });
    }
    if (Number.isInteger(item.proposalId) && item.decisionKey === undefined) {
      if (!scheduledIds.has(item.proposalId) || usedIds.has(item.proposalId)) {
        throw createError({ statusCode: 400, message: '決議須對應已排入的議案且不可重複' });
      }
      usedIds.add(item.proposalId);
      decisions.push({ proposalId: item.proposalId, decision: item.decision.trim() });
    } else if (typeof item.decisionKey === 'string' && item.proposalId === undefined) {
      if (!textKeys.has(item.decisionKey) || usedKeys.has(item.decisionKey)) {
        throw createError({ statusCode: 400, message: '決議須對應現有文字項目且不可重複' });
      }
      usedKeys.add(item.decisionKey);
      decisions.push({ decisionKey: item.decisionKey, decision: item.decision.trim() });
    } else {
      throw createError({ statusCode: 400, message: '決議須對應議案或文字項目' });
    }
  }
  if (usedIds.size !== scheduledIds.size || usedKeys.size !== textKeys.size) {
    throw createError({ statusCode: 409, message: '議程已變動，請重新載入會議' });
  }
  if (decisions.length) {
    await db.batch(
      decisions.map((item) =>
        item.proposalId !== undefined
          ? db
              .prepare(
                `INSERT INTO meeting_proposal_decisions (meeting_id, proposal_id, decision)
                 VALUES (?, ?, ?)
                 ON CONFLICT(meeting_id, proposal_id) DO UPDATE SET
                   decision = excluded.decision, updated_at = CURRENT_TIMESTAMP`,
              )
              .bind(id, item.proposalId, item.decision)
          : db
              .prepare(
                `INSERT INTO meeting_text_decisions (meeting_id, decision_key, decision)
                 VALUES (?, ?, ?)
                 ON CONFLICT(meeting_id, decision_key) DO UPDATE SET
                   decision = excluded.decision, updated_at = CURRENT_TIMESTAMP`,
              )
              .bind(id, item.decisionKey, item.decision),
      ),
    );
  }
  return decisions;
});
