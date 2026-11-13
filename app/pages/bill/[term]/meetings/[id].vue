<template>
  <div class="container mx-auto max-w-6xl px-4 py-8">
    <nav class="mb-6 text-sm text-gray-600" aria-label="麵包屑">
      <NuxtLink to="/" class="hover:text-primary">首頁</NuxtLink>
      <span class="mx-2">/</span>
      <NuxtLink to="/bill" class="hover:text-primary">議案查詢</NuxtLink>
      <span class="mx-2">/</span>
      <NuxtLink :to="`/bill/${term}`" class="hover:text-primary">{{ termLabel }}</NuxtLink>
      <span class="mx-2">/</span>
      <span class="text-gray-900">{{ meeting?.title || '會議' }}</span>
    </nav>

    <div
      v-if="meetingsError || billsError"
      class="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700"
    >
      {{ meetingsError?.message || billsError?.message || '載入資料失敗' }}
    </div>
    <div v-else-if="meetingsPending || billsPending" class="py-12 text-center text-gray-600">
      載入中...
    </div>
    <div
      v-else-if="!meeting"
      class="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800"
    >
      找不到這場會議。<NuxtLink :to="`/bill/${term}`" class="underline">返回會期會議</NuxtLink>
    </div>
    <template v-else>
      <header class="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p class="mb-2 text-sm font-bold text-primary">{{ meeting.meetingTypeName }}</p>
        <h1 class="mb-4 text-3xl font-bold text-gray-900">{{ meeting.title }}</h1>
        <dl class="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
          <div>
            <dt class="inline font-semibold">會議時間：</dt>
            <dd class="inline">{{ formatDateTime(meeting.meetingDate) }}</dd>
          </div>
          <div v-if="meeting.location">
            <dt class="inline font-semibold">地點：</dt>
            <dd class="inline">{{ meeting.location }}</dd>
          </div>
        </dl>
      </header>

      <BillFilter
        :filters="filters"
        :show-committee="false"
        :show-meeting="false"
        @update:filters="updateFilters"
      />
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-bold text-gray-900">
          已排入議案
          <span class="text-base font-normal text-gray-600">（{{ meetingBills.length }} 筆）</span>
        </h2>
      </div>
      <div v-if="filteredBills.length" class="grid gap-4">
        <BillCard v-for="bill in filteredBills" :key="bill.id" :bill="bill" />
      </div>
      <div v-else class="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">
        {{ meetingBills.length ? '找不到符合搜尋條件的議案。' : '本場會議尚無已排入的議案。' }}
      </div>
    </template>
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue';
  import { useRoute } from 'vue-router';
  import { formatTermLabel, parseTermCode } from '~~/shared/utils/term';

  const route = useRoute();
  const term = computed(() => parseTermCode(route.params.term));
  const meetingId = computed(() => Number(route.params.id));
  if (!term.value || !Number.isInteger(meetingId.value) || meetingId.value <= 0) {
    throw createError({ statusCode: 404, statusMessage: '會議參數欠缺或格式錯誤' });
  }
  const termLabel = computed(() => formatTermLabel(term.value));
  const {
    data: meetingsData,
    pending: meetingsPending,
    error: meetingsError,
  } = await useFetch(() => `/api/meetings/scheduled?session=${term.value}`);
  const {
    data: billsData,
    pending: billsPending,
    error: billsError,
  } = await useFetch(() => `/api/meetings/${meetingId.value}/proposals`);
  const meeting = computed(() =>
    (meetingsData.value ?? []).find((item) => item.id === meetingId.value),
  );
  const meetingBills = computed(() => billsData.value ?? []);
  const filters = ref({ keyword: '', proposer: '', dateFrom: '', dateTo: '' });
  function updateFilters(value) {
    filters.value = {
      keyword: value.keyword || '',
      proposer: value.proposer || '',
      dateFrom: value.dateFrom || '',
      dateTo: value.dateTo || '',
    };
  }
  const filteredBills = computed(() => {
    const keyword = filters.value.keyword.toLocaleLowerCase('zh-TW');
    const proposer = filters.value.proposer.toLocaleLowerCase('zh-TW');
    return meetingBills.value.filter((bill) => {
      const proposedAt = bill.proposedAt.slice(0, 10);
      if (filters.value.dateFrom && proposedAt < filters.value.dateFrom) return false;
      if (filters.value.dateTo && proposedAt > filters.value.dateTo) return false;
      if (proposer && !bill.proposerName.toLocaleLowerCase('zh-TW').includes(proposer))
        return false;
      return (
        !keyword ||
        [bill.subject, bill.description, bill.proposerName, bill.committeeName]
          .join(' ')
          .toLocaleLowerCase('zh-TW')
          .includes(keyword)
      );
    });
  });

  function formatDateTime(value) {
    return new Date(value).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  }

  useHead(() => ({ title: `${meeting.value?.title || '會議'} - 議案查詢` }));
</script>
