// shared/utils/term.ts

const EARLIEST_TERM = 252;

/**
 * 取得當前（最新）會期代碼
 * 內部以整數儲存，例如 26-2 會期為 262、27-1 會期為 271。
 * 判斷邏輯：每年 8 月 1 日到隔年 1 月 31 日為第 1 會期；
 * 每年 2 月 1 日到 7 月 31 日為第 2 會期。
 */
export const getCurrentTerm = (date = new Date()): number => {
  const { year, month } = getTaipeiDateParts(date);

  if (month === 1) {
    return (year - 2000) * 10 + 1;
  }

  if (month >= 2 && month <= 7) {
    return (year - 2000) * 10 + 2;
  }

  return (year - 1999) * 10 + 1;
};

// 取得最早有效會期代碼
export const getEarliestTerm = (): number => {
  return EARLIEST_TERM;
};

export const formatTermCode = (term: number | string | null | undefined): string => {
  const parsedTerm = parseTermCode(term);
  if (!parsedTerm) return '';

  return `${Math.floor(parsedTerm / 10)}-${parsedTerm % 10}`;
};

export const formatTermLabel = (term: number | string | null | undefined): string => {
  const formattedTerm = formatTermCode(term);
  return formattedTerm ? `${formattedTerm} 會期` : '';
};

export const parseTermCode = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return isValidTermCode(value) ? value : null;
  }

  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const hyphenated = normalized.match(/^(\d+)-([12])$/);
  if (hyphenated) {
    const parsed = Number(`${hyphenated[1]}${hyphenated[2]}`);
    return isValidTermCode(parsed) ? parsed : null;
  }

  const numeric = Number(normalized);
  return isValidTermCode(numeric) ? numeric : null;
};

export const isValidTermCode = (term: number): boolean => {
  return Number.isInteger(term) && term >= EARLIEST_TERM && (term % 10 === 1 || term % 10 === 2);
};

const getTaipeiDateParts = (date: Date): { year: number; month: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);

  return { year, month };
};
