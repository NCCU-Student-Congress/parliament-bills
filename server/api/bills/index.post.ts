export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['legislator', 'secretariat_admin']);

  const body = await readBody(event);
  if (body && Object.prototype.hasOwnProperty.call(body, 'cosponsorIds')) {
    throw createError({ statusCode: 400, statusMessage: '連署須由議員本人於連署頁操作' });
  }
  const billService = useBillService(event);
  const bill = await billService.saveBill({ ...body, proposerId: session.userId });

  setResponseStatus(event, 201);
  return bill;
});
