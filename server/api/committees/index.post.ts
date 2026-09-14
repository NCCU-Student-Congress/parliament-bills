export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const billService = useBillService(event);
  const committee = await billService.createCommittee(body);

  setResponseStatus(event, 201);
  return committee;
});
