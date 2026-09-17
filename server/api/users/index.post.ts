export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);

  const body = await readBody(event);
  const billService = useBillService(event);
  const user = await billService.createUser(body);

  setResponseStatus(event, 201);
  return user;
});
