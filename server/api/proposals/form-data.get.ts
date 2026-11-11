export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['legislator', 'secretariat_admin']);
  const users = await useBillService(event).getUsers();
  const proposer = users.find((user) => user.id === session.userId);

  if (!proposer) {
    throw createError({ statusCode: 401, statusMessage: '找不到登入者資料，請重新登入' });
  }

  return {
    proposer: {
      name: proposer.name,
      permissionRole: proposer.permissionRole,
    },
  };
});
