export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);

  const body = await readBody(event);
  const billService = useBillService(event);
  const meeting = await billService.createMeeting(body);

  setResponseStatus(event, 201);
  return meeting;
});
