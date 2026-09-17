// composables/useSecretariat.ts
import { ref, watch } from 'vue';
import { useAsyncData } from '#app';
import { formatTermLabel, getCurrentTerm } from '../../shared/utils/term';
import type { Bill } from '../../shared/types/bill';

/**
 * 將阿拉伯數字轉換為中文數字
 * @param num 阿拉伯數字
 * @returns 中文數字字串
 */
function toChineseNumeral(num: number): string {
  const chineseNumerals = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (num >= 0 && num <= 10) return chineseNumerals[num] ?? num.toString();
  if (num > 10 && num < 20) return '十' + (num % 10 === 0 ? '' : chineseNumerals[num % 10]);
  // 對於大於20的數字簡單處理，如果超出範圍，直接返回數字字串
  return num.toString();
}

export function useSecretariat() {
  const currentTerm = getCurrentTerm();
  const bills = ref<Bill[]>([]); // 儲存從 API 獲取的議案資料
  const error = ref<string | null>(null);

  const {
    pending: isLoading,
    data: asyncData,
    error: asyncError,
    refresh: fetchBills,
  } = useAsyncData<Bill[]>(`bills-term-${currentTerm}`, async () => {
    if (!currentTerm) {
      throw new Error('無法獲取當前屆期，請稍後再試。');
    }

    const data = await $fetch<Bill[]>(`/api/bills/?term=${currentTerm}`);

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('API 回應資料格式不正確或無議案資料。');
    }

    return data;
  });

  // 將 asyncData 同步到 bills ref
  watch(
    asyncData,
    (val) => {
      if (val) bills.value = val;
    },
    { immediate: true },
  );
  // 將 asyncError 同步到 error ref
  watch(
    asyncError,
    (val) => {
      if (val) error.value = val.message;
    },
    { immediate: true },
  );

  const generateAgenda = (orderString: string): string => {
    if (!orderString || !bills.value.length)
      return '請輸入有效的議案編號順序，並確保已載入議案資料。';
    return (
      orderString
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n))
        .map((num, index) => {
          const bill = bills.value.find((b) => b.id === num);
          return bill
            ? `（${toChineseNumeral(index + 1)}）審查${formatTermLabel(bill.session)}【${bill.subject}】。`
            : `（${toChineseNumeral(index + 1)}）無法找到${formatTermLabel(currentTerm)}索引 ${num} 的議案。`;
        })
        .join('\n') + '\n'
    );
  };

  const generateMinutes = (orderString: string): string => {
    if (!orderString || !bills.value.length)
      return '請輸入有效的議案編號順序，並確保已載入議案資料。';
    return orderString
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))
      .map((num, index) => {
        const bill = bills.value.find((b) => b.id === num);
        if (bill) {
          return (
            [
              `### 第${toChineseNumeral(index + 1)}案`,
              `會期：${formatTermLabel(bill.session)}`,
              `委員會：${bill.committeeName}`,
              `提案人：${bill.proposerName}`,
              `案由：${bill.subject}`,
              `說明：\n${bill.description}`,
              `附件：詳見[已提案件查詢系統](https://sxcongress.ntpusu.org/bill/proposal/${bill.id})`,
              `決議：\n　一、提案機關說明及經本會議員詢答完畢。\n　二、議員提案包裹表決，議員附議，通過。\n　三、全案，同意票票，不同意票票，通過。`,
            ].join('\n\n') + '\n\n'
          );
        }
        return `## 第${toChineseNumeral(index + 1)}案\n\n無法找到${formatTermLabel(currentTerm)}索引 ${num} 的議案資料。\n\n`;
      })
      .join('');
  };

  return { bills, currentTerm, isLoading, error, fetchBills, generateAgenda, generateMinutes };
}
