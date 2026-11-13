<template>
  <div class="container mx-auto max-w-6xl px-4 py-8">
    <div class="mb-8">
      <h1 class="mb-2 text-3xl font-bold text-gray-900">議案查詢</h1>
      <p class="text-gray-600">點選會期，再選擇已排案的會議查看議案。</p>
      <NuxtLink
        to="/bill/new"
        class="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-600"
      >
        新增議案
      </NuxtLink>
    </div>

    <div
      v-if="error || sessionsError"
      class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
    >
      {{ error?.message || sessionsError?.message || '載入資料失敗' }}
    </div>
    <div v-else-if="pending || sessionsPending" class="py-12 text-center text-gray-600">
      載入中...
    </div>
    <div
      v-else-if="scheduledSessions.length"
      class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    >
      <NuxtLink
        v-for="session in scheduledSessions"
        :key="session.id"
        :to="`/bill/${session.id}`"
        class="rounded-lg bg-white p-6 shadow-md transition-shadow duration-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <p class="mb-2 text-sm font-semibold text-primary">
          {{ session.title || formatTermLabel(session.id) }}
        </p>
        <h2 class="text-xl font-bold text-gray-900">學生議會</h2>
        <p class="mt-2 text-sm text-gray-600">查看本會期已排案的會議</p>
      </NuxtLink>
    </div>
    <div v-else class="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">
      尚無已排案的會議。
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import { formatTermLabel } from '../../../shared/utils/term';

  const { data: meetingsData, pending, error } = await useFetch('/api/meetings/scheduled');
  const {
    data: sessionsData,
    pending: sessionsPending,
    error: sessionsError,
  } = await useFetch('/api/sessions');
  const scheduledSessions = computed(() => {
    const ids = new Set((meetingsData.value ?? []).map((meeting) => meeting.session));
    return (sessionsData.value ?? []).filter((session) => ids.has(session.id));
  });

  definePageMeta({
    title: '議案查詢',
    description: '查看' + ORG_DATA.nameZhFull + '歷屆已排案會議與議案資料。',
  });
</script>
