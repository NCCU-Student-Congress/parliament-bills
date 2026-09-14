import { parseTermCode } from '../../../../shared/utils/term';

export default defineEventHandler(async (event) => {
  const term = parseTermCode(getRouterParam(event, 'term'));
  const id = parseInt(getRouterParam(event, 'number') || '0', 10);

  if (!term || !id) {
    throw createError({ statusCode: 400, statusMessage: '無效的議案參數' });
  }

  const billService = useBillService(event);
  const bill = await billService.getBillByTermAndId(term, id);

  if (!bill) {
    throw createError({ statusCode: 404, statusMessage: '找不到該議案' });
  }

  return bill;
});
