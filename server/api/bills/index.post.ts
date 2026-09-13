// server/api/bills/index.post.ts
// Body 使用既有 Bill JSON shape；rowIndex 可省略，由 D1 自動接續最大流水號。
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const billService = useBillService(event);
  const bill = await billService.saveBill(body);

  setResponseStatus(event, 201);
  return bill;
});
