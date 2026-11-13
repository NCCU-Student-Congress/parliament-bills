export default defineEventHandler(async (event) => {
  return useBillService(event).getAllBills();
});
