export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);

  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '無效的議案索引' });
  }

  return useBillService(event).deleteBill(id);
});
