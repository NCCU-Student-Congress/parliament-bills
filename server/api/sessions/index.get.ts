export default defineEventHandler(async (event) => {
  const billService = useBillService(event);
  return billService.getSessions();
});
