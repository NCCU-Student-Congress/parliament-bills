export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);

  const body = await readBody(event);
  const billService = useBillService(event);
  const committee = await billService.createCommittee(body);

  setResponseStatus(event, 201);
  return committee;
});
