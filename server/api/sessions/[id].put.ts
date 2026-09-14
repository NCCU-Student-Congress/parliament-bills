import { parseTermCode } from '../../../shared/utils/term';

export default defineEventHandler(async (event) => {
  const id = parseTermCode(getRouterParam(event, 'id'));

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '無效的會期代碼' });
  }

  const body = await readBody(event);
  const billService = useBillService(event);
  return billService.updateSession(id, body);
});
