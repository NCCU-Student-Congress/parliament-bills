export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0', 10);

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '無效的委員會索引' });
  }

  const billService = useBillService(event);
  return billService.deleteCommittee(id);
});
