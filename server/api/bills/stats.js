export default defineEventHandler(async (event) => {
  try {
    const db = useD1Database(event);
    const today = getTaipeiDateString();

    const currentSession = await db
      .prepare(
        `SELECT id
         FROM sessions
         WHERE (starts_at IS NULL OR date(starts_at) <= date(?))
           AND (ends_at IS NULL OR date(ends_at) >= date(?))
         ORDER BY id DESC
         LIMIT 1`,
      )
      .bind(today, today)
      .first();

    if (!currentSession?.id) {
      throw createError({
        statusCode: 500,
        statusMessage: `No session covers current date ${today}`,
      });
    }

    const totalBills = await db.prepare('SELECT COUNT(*) AS count FROM proposals').first('count');
    const thisTermBills = await db
      .prepare('SELECT COUNT(*) AS count FROM proposals WHERE session = ?')
      .bind(currentSession.id)
      .first('count');

    if (totalBills === null || thisTermBills === null) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to count proposal statistics',
      });
    }

    return {
      data: {
        totalBills: Number(totalBills),
        currentTerm: currentSession.id,
        thisTermBills: Number(thisTermBills),
      },
      message: 'Statistics fetched successfully',
    };
  } catch (error) {
    console.error('Error fetching bill statistics:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch bill statistics',
      data: null,
    });
  }
});

function getTaipeiDateString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
