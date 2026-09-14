<template>
  <div class="container mx-auto px-4 py-8">
    <nav class="mb-6">
      <ol class="flex items-center space-x-2 text-sm text-gray-600">
        <li>
          <NuxtLink to="/" class="hover:text-primary">首頁</NuxtLink>
        </li>
        <li>/</li>
        <li>
          <NuxtLink to="/bill" class="hover:text-primary">議案查詢</NuxtLink>
        </li>
        <li>/</li>
        <li class="text-gray-900">{{ termLabel }}</li>
      </ol>
    </nav>

    <div v-if="isOutOfRange" class="text-center text-red-500 font-bold my-12">
      僅有 {{ formatTermLabel(getEarliestTerm()) }} ~ {{ formatTermLabel(getCurrentTerm()) }} 資料
      <div class="mt-8 flex justify-center gap-4">
        <NuxtLink
          to="/bill"
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
        >
          各會期議案
        </NuxtLink>
        <NuxtLink
          to="/"
          class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
        >
          回到首頁
        </NuxtLink>
      </div>
    </div>
    <template v-else>
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ termLabel }}議案</h1>
        <p class="text-gray-600">查詢{{ termLabel }}學生議會議案資料</p>
      </div>

      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-center">
          <ExclamationTriangleIcon class="h-5 w-5 text-red-500 mr-2" />
          <p class="text-red-700">{{ error.message || '載入資料失敗' }}</p>
        </div>
      </div>

      <div v-if="pending" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span class="ml-2 text-gray-600">載入中...</span>
      </div>

      <div v-if="!pending && !error" class="mb-8">
        <BillFilter
          :filters="filters"
          :committees="committees"
          @update:filters="updateFilters"
          @reset-filters="resetFilters"
        />
      </div>

      <div v-if="!pending && !error && filteredBills.length > 0" class="space-y-6">
        <div class="text-sm text-gray-600">共找到 {{ filteredBills.length }} 筆議案</div>

        <!-- 上方分頁選單 -->
        <Pagination
          v-model:current-page="currentPage"
          :total-pages="frontendTotalPages"
          :total-items="filteredBills.length"
          :items-per-page="itemsPerPage"
        />

        <div class="grid gap-4">
          <BillCard v-for="bill in paginatedBills" :key="bill.id" :bill="bill" />
        </div>

        <!-- 下方分頁選單 -->
        <Pagination
          v-model:current-page="currentPage"
          :total-pages="frontendTotalPages"
          :total-items="filteredBills.length"
          :items-per-page="itemsPerPage"
        />
      </div>

      <div v-if="!pending && !error && filteredBills.length === 0" class="text-center py-12">
        <DocumentTextIcon class="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <!-- 換屆過渡期：目前會期尚無議案資料 -->
        <template v-if="term === getCurrentTerm()">
          <h3 class="text-lg font-medium text-amber-700 mb-2">{{ termLabel }}尚未有任何提案資料</h3>
          <p class="text-amber-600">請查看其他會期，或等待資料更新</p>
        </template>
        <template v-else>
          <h3 class="text-lg font-medium text-gray-900 mb-2">找不到相關議案</h3>
          <p class="text-gray-600">請調整篩選條件或稍後再試</p>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue';
  import { useRoute } from 'vue-router';
  import { ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/vue/24/outline';
  import {
    formatTermLabel,
    getCurrentTerm,
    getEarliestTerm,
    parseTermCode,
  } from '~~/shared/utils/term';

  const route = useRoute();
  const routeTerm = parseTermCode(route.params.term);

  // 驗證會期參數
  if (!routeTerm) {
    throw createError({
      statusCode: 404,
      statusMessage: '會期參數欠缺或格式錯誤',
    });
  }

  const term = routeTerm;
  const termLabel = formatTermLabel(term);

  const { data: bills, pending, error, refresh } = await useFetch(`/api/bills?term=${term}`);
  const { data: committeesData } = await useFetch('/api/committees');
  const { data: sessionsData } = await useFetch('/api/sessions');
  const committees = computed(() => committeesData.value ?? []);
  const sessions = computed(() => sessionsData.value ?? []);

  const isOutOfRange = computed(() => {
    return sessions.value.length > 0 && !sessions.value.some((session) => session.id === term);
  });

  // 響應式數據
  const currentPage = ref(1);
  const itemsPerPage = 10;

  // 篩選器狀態 (為特定會期頁面調整)
  const filters = ref({
    term: String(term),
    committeeId: '',
    proposer: '',
    meeting: '',
    keyword: '',
    dateFrom: '',
    dateTo: '',
  });

  // 用過濾後的資料來算分頁數
  const frontendTotalPages = computed(() => {
    return Math.ceil(filteredBills.value.length / itemsPerPage);
  });

  // 監聽路由參數變化，當會期改變時重設篩選條件並重新載入
  watch(
    () => route.params.term,
    async (newTerm) => {
      const newTermParsed = parseTermCode(newTerm);
      if (newTermParsed && newTermParsed !== term) {
        filters.value.term = String(newTermParsed);
        currentPage.value = 1;
        if (typeof refresh === 'function') await refresh();
      }
    },
    { immediate: true },
  );

  // 計算過濾後的議案
  const filteredBills = computed(() => {
    if (!Array.isArray(bills.value)) return [];

    return bills.value
      .filter((bill) => {
        if (filters.value.committeeId && bill.committeeId !== Number(filters.value.committeeId)) {
          return false;
        }

        if (
          filters.value.proposer &&
          !bill.proposerName.toLowerCase().includes(filters.value.proposer.toLowerCase())
        ) {
          return false;
        }

        if (
          filters.value.meeting &&
          !bill.meetingTitle.toLowerCase().includes(filters.value.meeting.toLowerCase())
        ) {
          return false;
        }

        if (filters.value.keyword) {
          const keyword = filters.value.keyword.toLowerCase();
          const content = [
            bill.subject,
            bill.description,
            bill.committeeName,
            bill.meetingTitle,
            bill.proposerName,
            ...(bill.cosponsors ?? []).map((cosponsor) => cosponsor.userName),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!content.includes(keyword)) return false;
        }

        const billDateISO = normalizeDate(bill.proposedAt);

        if (billDateISO) {
          if (filters.value.dateFrom && billDateISO < filters.value.dateFrom) return false;
          if (filters.value.dateTo && billDateISO > filters.value.dateTo) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = normalizeDate(a.proposedAt);
        const dateB = normalizeDate(b.proposedAt);
        if (!dateA || !dateB) return 0;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  });

  // 分頁計算 (僅限前端顯示)
  const paginatedBills = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredBills.value.slice(start, end);
  });

  // 方法
  const updateFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters, term: String(term) };
    currentPage.value = 1;
  };

  const resetFilters = () => {
    filters.value = {
      term: String(term),
      committeeId: '',
      proposer: '',
      meeting: '',
      keyword: '',
      dateFrom: '',
      dateTo: '',
    };
    currentPage.value = 1;
  };

  const normalizeDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) return date;

    // 處理含中文的日期格式: "2025/7/1 下午 11:07:25"
    if (typeof date === 'string') {
      const match = date.match(
        /(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(上午|下午)\s*(\d{1,2}):(\d{2}):(\d{2})/,
      );
      if (match) {
        const [, year, month, day, ampm, hour, min, sec] = match;
        let h = parseInt(hour, 10);
        if (ampm === '下午' && h < 12) h += 12;
        if (ampm === '上午' && h === 12) h = 0;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${min}:${sec}`;
      }
    }

    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  };

  // 監聽前端頁碼變化，僅用於控制 paginatedBills，不觸發 API 請求
  watch(currentPage, () => {
    // 當前頁碼改變時，不需要重新獲取數據，因為數據已經在 bills.value 中
  });

  // SEO 設定
  useHead({
    title: `${termLabel}議案查詢 - 三峽校區議事服務`,
    meta: [
      {
        name: 'description',
        content: `查詢三峽校區學生議會${termLabel}議案資料`,
      },
    ],
  });
</script>

<style scoped>
  .container {
    max-width: 1200px;
  }
</style>
