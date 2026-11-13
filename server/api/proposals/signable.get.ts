export default defineEventHandler(async (event) => {
  // These proposals are public on the bill pages anyway, so read them while checking the session
  // instead of after it. Nothing is returned unless the check passes.
  const [, bills] = await Promise.all([
    requireRole(event, ['legislator', 'secretariat_admin']),
    useBillService(event).getSignableBills(),
  ]);
  return bills;
});
