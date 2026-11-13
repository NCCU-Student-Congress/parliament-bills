<template>
  <div class="container mx-auto max-w-6xl py-8 sm:px-4">
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
      v-if="meetingsError || billsError || agendaError"
      class="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700"
    >
      {{ meetingsError?.message || billsError?.message || agendaError?.message || '載入資料失敗' }}
    </div>
    <div
      v-else-if="meetingsPending || billsPending || agendaPending"
      class="py-12 text-center text-gray-600"
    >
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
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="min-w-0 text-sm font-bold text-primary">{{ meeting.meetingTypeName }}</p>
          <LoadingButton
            type="button"
            class="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            :loading="reloading"
            @click="reloadLatest"
          >
            重新整理
          </LoadingButton>
        </div>
        <h1 class="mb-4 text-3xl font-bold text-gray-900">
          <template v-if="meetingTitleParts"
            ><span class="inline-block whitespace-nowrap">{{ meetingTitleParts.term }}</span
            ><wbr /><span class="inline-block whitespace-nowrap">{{
              meetingTitleParts.rest
            }}</span></template
          >
          <template v-else>{{ meeting.title }}</template>
        </h1>
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

      <section
        class="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        aria-label="會議議程"
      >
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-xl font-bold text-gray-900">會議議程</h2>
          <div class="relative">
            <button
              type="button"
              class="rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="copyAgenda"
            >
              複製議程
            </button>
            <span
              role="status"
              class="absolute right-0 top-full whitespace-nowrap pt-1 text-xs text-green-700"
            >
              {{ copied ? '已複製' : '' }}
            </span>
          </div>
        </div>
        <div class="space-y-1 leading-8 text-gray-900">
          <div
            v-for="(line, index) in agendaLinesForMeeting"
            :key="index"
            :class="line.entry.kind === 'heading' ? 'pt-3 font-bold first:pt-0' : 'pl-4'"
          >
            <NuxtLink
              v-if="line.entry.kind === 'proposal'"
              :to="`/bill/proposal/${line.entry.proposalId}`"
              class="block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary hover:bg-gray-100"
            >
              <AgendaHangingText :text="line.text" />
            </NuxtLink>
            <span v-else class="whitespace-pre-wrap">
              <AgendaHangingText :text="line.text" />
            </span>
          </div>
        </div>
      </section>

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
  import { useRoute } from '#app';
  import { formatTermLabel, parseTermCode } from '~~/shared/utils/term';
  import { agendaLines, normalizeAgenda } from '~~/shared/utils/agenda';

  const route = useRoute();
  const term = parseTermCode(route.params.term);
  const meetingId = Number(route.params.id);
  if (!term || !Number.isInteger(meetingId) || meetingId <= 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: '會議參數欠缺或格式錯誤',
    });
  }
  const termLabel = formatTermLabel(term);
  const [
    { data: meetingsData, pending: meetingsPending, error: meetingsError },
    { data: billsData, pending: billsPending, error: billsError },
    { data: agendaData, pending: agendaPending, error: agendaError },
  ] = await Promise.all([
    usePrefetchableFetch(`/api/meetings/scheduled?session=${term}`),
    usePrefetchableFetch(`/api/meetings/${meetingId}/proposals`),
    usePrefetchableFetch(`/api/meetings/${meetingId}/agenda`),
  ]);
  const meeting = computed(() => (meetingsData.value ?? []).find((item) => item.id === meetingId));
  const meetingTitleParts = computed(() => {
    const match = meeting.value?.title.match(/^(.*?會期)(.+)$/);
    return match ? { term: match[1], rest: match[2] } : null;
  });
  const meetingBills = computed(() => billsData.value ?? []);
  const displayAgendaEntries = computed(() =>
    meeting.value ? normalizeAgenda(meeting.value, meetingBills.value, agendaData.value ?? []) : [],
  );
  const agendaLinesForMeeting = computed(() =>
    agendaLines(displayAgendaEntries.value, meetingBills.value),
  );
  const orderedMeetingBills = computed(() => {
    const order = new Map(
      displayAgendaEntries.value
        .filter((entry) => entry.kind === 'proposal')
        .map((entry, index) => [entry.proposalId, index]),
    );
    return [...meetingBills.value].sort(
      (a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  });
  // Public reads come from a short-lived edge cache; this skips it so live meeting changes show at once.
  const reloading = ref(false);
  async function reloadLatest() {
    reloading.value = true;
    try {
      const [meetings, bills, agenda] = await Promise.all([
        $fetch(`/api/meetings/scheduled?session=${term}`, FRESH_FETCH_OPTIONS),
        $fetch(`/api/meetings/${meetingId}/proposals`, FRESH_FETCH_OPTIONS),
        $fetch(`/api/meetings/${meetingId}/agenda`, FRESH_FETCH_OPTIONS),
      ]);
      meetingsData.value = meetings;
      billsData.value = bills;
      agendaData.value = agenda;
    } catch (error) {
      console.error('取得最新資料失敗:', error);
    } finally {
      reloading.value = false;
    }
  }
  const copied = ref(false);
  async function copyAgenda() {
    try {
      await navigator.clipboard.writeText(
        agendaLinesForMeeting.value
          .map((line, index) => `${index && line.entry.kind === 'heading' ? '\n' : ''}${line.text}`)
          .join('\n'),
      );
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } catch {
      copied.value = false;
    }
  }
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
    return orderedMeetingBills.value.filter((bill) => {
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
