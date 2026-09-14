export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const billService = useBillService(event);
  const user = await billService.createUser(body);

  setResponseStatus(event, 201);
  return user;
});
