export default defineEdgeCachedEventHandler(async (event) => {
  return useBillService(event).getAllBills();
});
