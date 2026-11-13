import { parseTermCode } from '../../../shared/utils/term';

export default defineEdgeCachedEventHandler(async (event) => {
  const query = getQuery(event);
  const committeeId = query.committeeId ? Number(query.committeeId) : undefined;
  const session = query.session ? parseTermCode(query.session) : undefined;

  const billService = useBillService(event);
  return billService.getMeetings({
    committeeId:
      typeof committeeId === 'number' && Number.isInteger(committeeId) && committeeId > 0
        ? committeeId
        : undefined,
    session: session ?? undefined,
  });
});
