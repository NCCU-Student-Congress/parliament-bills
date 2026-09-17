import { createError } from 'h3';

const bulkUserPattern = /\s*([^<>,]+?)\s*<\s*([^<>\s,]+@[^<>\s,]+)\s*>\s*(?:,|$)/gy;

function parseBulkUsers(value: unknown) {
  const source = typeof value === 'string' ? value.trim() : '';

  if (!source) {
    throw createError({ statusCode: 400, statusMessage: '請輸入批次名單' });
  }

  const users: Array<{ name: string; email: string }> = [];
  let cursor = 0;

  while (cursor < source.length) {
    bulkUserPattern.lastIndex = cursor;
    const match = bulkUserPattern.exec(source);

    if (!match) {
      throw createError({
        statusCode: 400,
        statusMessage: '批次名單格式不正確，請使用「姓名<email>,姓名<email>」',
      });
    }

    users.push({
      name: match[1].trim(),
      email: match[2].trim(),
    });
    cursor = bulkUserPattern.lastIndex;
  }

  return users;
}

export default defineEventHandler(async (event) => {
  await requireRole(event, ['secretariat_admin']);

  const body = await readBody(event);
  const users = parseBulkUsers(body?.entries).map((user) => ({
    ...user,
    permissionRole: body?.permissionRole,
    committeeIds: body?.committeeIds,
  }));
  const billService = useBillService(event);
  const createdUsers = await billService.createUsers(users);

  setResponseStatus(event, 201);
  return { users: createdUsers };
});
