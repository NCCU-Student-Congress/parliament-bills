<template>
  <div class="container mx-auto max-w-6xl px-4 py-8">
    <nav class="mb-6 text-sm text-gray-600" aria-label="麵包屑">
      <NuxtLink to="/" class="hover:text-primary">首頁</NuxtLink>
      <span class="mx-2">/</span>
      <NuxtLink to="/bill" class="hover:text-primary">議案查詢</NuxtLink>
      <span class="mx-2">/</span>
      <span class="text-gray-900">{{ termLabel }}</span>
    </nav>

    <header class="mb-8">
      <h1 class="mb-2 text-3xl font-bold text-gray-900">{{ termLabel }}會議</h1>
      <p class="text-gray-600">選擇會議，查看議程與已排入的議案。</p>
    </header>

    <div
      v-if="isOutOfRange"
      class="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800"
    >
      找不到這個會期。<NuxtLink to="/bill" class="underline">返回議案查詢</NuxtLink>
    </div>
    <div
      v-else-if="meetingsError"
      class="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700"
    >
      {{ meetingsError?.message || '載入會議失敗' }}
    </div>
    <div v-else-if="meetingsPending" class="py-12 text-center text-gray-600">載入中...</div>
    <main v-else-if="meetingGroups.length" class="space-y-10">
      <h2 class="text-xl font-bold text-gray-900">會議類型</h2>
      <section v-for="group in meetingGroups" :key="group.name" :aria-label="group.name">
        <h3 class="mb-4 border-b border-gray-200 pb-2 text-lg font-bold text-primary">
          {{ group.name }}
        </h3>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="meeting in group.meetings"
            :key="meeting.id"
            :to="`/bill/${term}/meetings/${meeting.id}`"
            class="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <h4 class="mb-3 text-lg font-bold text-gray-900">{{ meeting.title }}</h4>
            <p class="text-sm text-gray-600">{{ formatDateTime(meeting.meetingDate) }}</p>
            <p v-if="meeting.location" class="mt-1 text-sm text-gray-600">{{ meeting.location }}</p>
            <p class="mt-4 text-sm font-semibold text-primary">
              {{ meeting.proposalCount }} 筆議案 →
            </p>
          </NuxtLink>
        </div>
      </section>
    </main>
    <div v-else class="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">
      本會期尚無會議。
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import { useRoute } from '#app';
  import { formatTermLabel, parseTermCode } from '~~/shared/utils/term';

  const route = useRoute();
  const term = parseTermCode(route.params.term);
  if (!term) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: '會期參數欠缺或格式錯誤',
    });
  }
  const termLabel = formatTermLabel(term);
  const [
    { data: meetingsData, pending: meetingsPending, error: meetingsError },
    { data: sessionsData },
  ] = await Promise.all([useFetch(`/api/meetings/scheduled?session=${term}`), useSessions()]);

  const isOutOfRange = computed(
    () =>
      (sessionsData.value ?? []).length > 0 &&
      !(sessionsData.value ?? []).some((session) => session.id === term),
  );

  const meetingGroups = computed(() => {
    const groups = new Map();
    for (const meeting of meetingsData.value ?? []) {
      const name = meeting.meetingTypeName || '大會';
      const items = groups.get(name) ?? [];
      items.push(meeting);
      groups.set(name, items);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => (a === '大會' ? -1 : b === '大會' ? 1 : a.localeCompare(b, 'zh-TW')))
      .map(([name, items]) => ({
        name,
        meetings: items.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate)),
      }));
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

  useHead(() => ({ title: `${termLabel}會議 - 議案查詢` }));
</script>
