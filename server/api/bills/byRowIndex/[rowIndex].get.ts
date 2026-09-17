export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'rowIndex') || '0', 10);

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '無效的議案索引' });
  }

  const billService = useBillService(event);
  const bill = await billService.getBillById(id);

  if (!bill) {
    throw createError({ statusCode: 404, statusMessage: '找不到該議案' });
  }

  return bill;
});
