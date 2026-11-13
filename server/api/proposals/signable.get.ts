export default defineEventHandler(async (event) => {
  await requireRole(event, ['legislator', 'secretariat_admin']);
  return useBillService(event).getSignableBills();
});
