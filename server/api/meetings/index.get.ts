import { parseTermCode } from '../../../shared/utils/term';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const committeeId = query.committeeId ? Number(query.committeeId) : undefined;
  const session = query.session ? parseTermCode(query.session) : undefined;

  const billService = useBillService(event);
  return billService.getMeetings({
    committeeId: Number.isInteger(committeeId) && committeeId > 0 ? committeeId : undefined,
    session: session ?? undefined,
  });
});
