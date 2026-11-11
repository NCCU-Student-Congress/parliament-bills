export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['legislator']);
  const id = Number(getRouterParam(event, 'id'));

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '無效的議案索引' });
  }

  return useBillService(event).cosignBill(id, session.userId);
});
