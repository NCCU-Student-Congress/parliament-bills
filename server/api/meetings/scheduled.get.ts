import { parseTermCode } from '../../../shared/utils/term';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const session = query.session === undefined ? undefined : parseTermCode(query.session);
  if (query.session !== undefined && !session) {
    throw createError({ statusCode: 400, message: '無效的會期參數' });
  }
  return useBillService(event).getScheduledMeetings(session ?? undefined);
});
