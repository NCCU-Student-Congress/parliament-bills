export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);

  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: '無效的議案索引' });
  }

  const body = await readBody(event);
  if (!body || !Object.prototype.hasOwnProperty.call(body, 'meetingIds')) {
    throw createError({ statusCode: 400, message: '請提供會議索引' });
  }

  return useBillService(event).scheduleBill(id, body.meetingIds);
});
