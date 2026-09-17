export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);

  const billService = useBillService(event);
  const session = await billService.createSession();

  setResponseStatus(event, 201);
  return session;
});
