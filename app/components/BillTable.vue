<template>
  <div class="bill-table-container">
    <!-- 桌面版表格 -->
    <div class="hidden md:block overflow-x-auto">
      <table
        class="min-w-full overflow-hidden rounded-xl border border-[#dcdce2] border-t-primary bg-white shadow-[0_10px_40px_rgba(0,0,36,0.05)]"
      >
        <thead class="border-b border-[#dcdce2] bg-[#f5f5f7]">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-black text-[#12122b]">案由</th>
            <th class="px-6 py-3 text-left text-xs font-black text-[#12122b]">編號</th>
            <th class="px-6 py-3 text-left text-xs font-black text-[#12122b]">提案類型</th>
            <th class="px-6 py-3 text-left text-xs font-black text-[#12122b]">提案機關/議員</th>
            <th class="px-6 py-3 text-left text-xs font-black text-[#12122b]">提案時間</th>
            <th class="px-6 py-3 text-left text-xs font-black text-[#12122b]">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#dcdce2] bg-white">
          <tr
            v-for="bill in bills"
            :key="bill.編號"
            class="cursor-pointer transition-colors hover:bg-[#f5f5f7]"
            @click="navigateToBill(bill)"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-bold text-[#12122b]">
                {{ bill.案由 }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-xs font-bold text-[#5a5a70]">
                {{ bill.編號 }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-black text-white"
              >
                {{ bill.提案類型 }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-semibold text-[#12122b]">
                {{ bill['提案機關/議員'] }}
              </div>
              <div class="text-xs font-semibold text-[#5a5a70]">
                {{ bill['提案機關主管/提案議員姓名'] }}
              </div>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm font-semibold text-[#5a5a70]">
              {{ formatDate(bill.時間戳記) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click.stop="navigateToBill(bill)"
                class="font-black text-primary underline underline-offset-4 transition-colors hover:text-primary-700"
              >
                查看詳情
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 手機版卡片列表 -->
    <div class="md:hidden space-y-4">
      <div
        v-for="bill in bills"
        :key="bill.編號"
        class="cursor-pointer rounded-xl border border-[#dcdce2] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,36,0.06)] transition-colors hover:bg-[#f5f5f7]"
        @click="navigateToBill(bill)"
      >
        <div class="flex justify-between items-start mb-2">
          <h3 class="flex-1 pr-2 text-sm font-black text-[#12122b]">
            {{ bill.案由 }}
          </h3>
          <span
            class="inline-flex items-center whitespace-nowrap rounded-full bg-primary px-2 py-1 text-xs font-black text-white"
          >
            {{ bill.提案類型 }}
          </span>
        </div>

        <div class="mb-2 text-xs font-bold text-[#5a5a70]">
          {{ bill.編號 }}
        </div>

        <div class="mb-2 text-sm font-semibold text-[#12122b]">
          <div>{{ bill['提案機關/議員'] }}</div>
          <div class="text-xs text-[#5a5a70]">
            {{ bill['提案機關主管/提案議員姓名'] }}
          </div>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-xs font-semibold text-[#5a5a70]">
            {{ formatDate(bill.時間戳記) }}
          </span>
          <button
            @click.stop="navigateToBill(bill)"
            class="text-sm font-black text-primary underline underline-offset-4 transition-colors hover:text-primary-700"
          >
            查看詳情
          </button>
        </div>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-if="bills.length === 0" class="text-center py-12">
      <div class="text-[#5a5a70]">
        <svg
          class="mx-auto h-12 w-12 text-[#5a5a70]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 class="mt-2 text-sm font-black text-[#12122b]">暫無議案</h3>
        <p class="mt-1 text-sm text-[#5a5a70]">
          目前沒有符合條件的議案，請調整篩選條件或稍後再試。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    bills: {
      type: Array,
      required: true,
    },
  });

  const router = useRouter();

  const navigateToBill = (bill) => {
    const billTerm = computed(() => {
      const match = bill.編號.match(/(\d+)屆/);
      return match ? match[1] : '26';
    });

    const billNumber = computed(() => {
      const match = bill.編號.match(/第(\d+)號/);
      return match ? match[1] : '1';
    });

    router.push(`/bill/${billTerm.value}/${billNumber.value}`);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  };
</script>

<style scoped>
  .text-primary {
    color: #000024;
  }

  /* 表格響應式設計 */
  @media (max-width: 768px) {
    .bill-table-container {
      @apply px-4;
    }
  }

  /* 確保表格在小螢幕上的可用性 */
  .overflow-x-auto {
    scrollbar-width: thin;
    scrollbar-color: #000024 #f5f5f7;
  }

  .overflow-x-auto::-webkit-scrollbar {
    height: 6px;
  }

  .overflow-x-auto::-webkit-scrollbar-track {
    background: #f5f5f7;
    border-radius: 3px;
  }

  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #dcdce2;
    border-radius: 3px;
  }

  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: #000024;
  }
</style>
