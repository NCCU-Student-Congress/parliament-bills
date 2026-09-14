export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const billService = useBillService(event);
  const meeting = await billService.createMeeting(body);

  setResponseStatus(event, 201);
  return meeting;
});
