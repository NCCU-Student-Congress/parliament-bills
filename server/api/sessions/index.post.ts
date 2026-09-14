export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const billService = useBillService(event);
  const session = await billService.createSession(body);

  setResponseStatus(event, 201);
  return session;
});
