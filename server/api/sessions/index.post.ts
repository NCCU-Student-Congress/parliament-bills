export default defineEventHandler(async (event) => {
  const billService = useBillService(event);
  const session = await billService.createSession();

  setResponseStatus(event, 201);
  return session;
});
