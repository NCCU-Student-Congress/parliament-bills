export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);

  const id = parseInt(getRouterParam(event, 'id') || '0', 10);

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '無效的人員索引' });
  }

  const billService = useBillService(event);
  return billService.deleteUser(id);
});
