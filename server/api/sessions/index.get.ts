export default defineEdgeCachedEventHandler(async (event) => {
  const billService = useBillService(event);
  return billService.getSessions();
});
