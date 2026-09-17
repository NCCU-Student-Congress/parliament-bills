export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);

  const billService = useBillService(event);
  return billService.getUsers();
});
