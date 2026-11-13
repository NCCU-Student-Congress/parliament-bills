export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0', 10);

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: '無效的議案索引' });
  }

  const billService = useBillService(event);
  const proposal = await billService.getBillById(id);

  if (!proposal) {
    throw createError({ statusCode: 404, message: '找不到該議案' });
  }

  return proposal;
});
