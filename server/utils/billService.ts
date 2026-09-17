// server/utils/billService.ts
import type { H3Event } from 'h3';

export const useBillService = (event: H3Event) => {
  const db = useD1Database(event);
  return createProposalRepository(db);
};
