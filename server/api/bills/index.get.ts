// server/api/bills/index.get.ts
import { parseTermCode } from '../../../shared/utils/term';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const billService = useBillService(event);

  let results: any[] = [];

  if (query.type === 'all') {
    results = await billService.getAllBills();
  } else if (query.term) {
    const termNumber = parseTermCode(query.term);
    if (!termNumber) {
      throw createError({ statusCode: 400, statusMessage: '無效的會期參數' });
    }
    results = await billService.getBillsByTerm(termNumber);
  }

  // 預設回傳 D1 中最新會期的議案
  else {
    results = await billService.getLatestTermBills();
  }

  if (query.limit) {
    const limit = parseInt(query.limit as string, 10);

    if (results.length < limit) {
      const pastBills = await billService.getPastTermBills();
      results = [...results, ...pastBills].slice(0, limit);
    } else {
      results = results.slice(0, limit);
    }
  }

  return results;
});
