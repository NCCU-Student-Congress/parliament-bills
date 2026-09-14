export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: '舊版 AppSheet 議案查詢已停用',
  });
});
