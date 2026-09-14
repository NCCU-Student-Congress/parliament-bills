// server/api/bills/[term]/[number].get.ts
import { parseTermCode } from '../../../../shared/utils/term';

// 處理 /api/bills/271/43 這種請求
export default defineEventHandler(async (event) => {
  const term = parseTermCode(getRouterParam(event, 'term'));
  const num = parseInt(getRouterParam(event, 'number') || '0', 10);

  if (!term || !num) {
    throw createError({ statusCode: 400, statusMessage: '無效的議案參數' });
  }

  const billService = useBillService(event);
  const bill = await billService.getBillById(term, num);

  if (!bill) {
    throw createError({ statusCode: 404, statusMessage: '找不到該議案' });
  }

  return bill;
});
