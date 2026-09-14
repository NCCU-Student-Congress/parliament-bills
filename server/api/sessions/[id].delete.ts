import { parseTermCode } from '../../../shared/utils/term';

export default defineEventHandler(async (event) => {
  const id = parseTermCode(getRouterParam(event, 'id'));

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '無效的會期代碼' });
  }

  const billService = useBillService(event);
  return billService.deleteSession(id);
});
