export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['legislator', 'secretariat_admin']);

  const body = await readBody(event);
  const billService = useBillService(event);
  const bill = await billService.saveBill({ ...body, proposerId: session.userId });

  setResponseStatus(event, 201);
  return bill;
});
