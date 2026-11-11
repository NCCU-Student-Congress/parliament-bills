export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);

  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '無效的議案索引' });
  }

  const body = await readBody(event);
  if (
    !body ||
    typeof body !== 'object' ||
    typeof body.field !== 'string' ||
    !Object.prototype.hasOwnProperty.call(body, 'value') ||
    Object.keys(body).some((key) => key !== 'field' && key !== 'value')
  ) {
    throw createError({ statusCode: 400, statusMessage: '請提供要修改的欄位與內容' });
  }

  return useBillService(event).updateBill(id, body.field, body.value);
});
