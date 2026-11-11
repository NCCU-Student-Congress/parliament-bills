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
    cosponsors: users
      .filter((user) => user.permissionRole === 'legislator' && user.id !== proposer.id)
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        committeeIds: user.committeeIds,
      })),
  };
});
