<template>
  <div class="container mx-auto px-4 py-8">
    <nav class="mb-6 print:hidden">
      <ol class="flex items-center space-x-2 text-sm text-gray-600">
        <li>
          <NuxtLink to="/" class="hover:text-primary">首頁</NuxtLink>
        </li>
        <li>/</li>
        <li>
          <NuxtLink to="/bill" class="hover:text-primary">議案查詢</NuxtLink>
        </li>
        <li>/</li>
        <li v-if="bill">
          <NuxtLink :to="`/bill/${bill.session}`" class="hover:text-primary">
            {{ formatTermLabel(bill.session) }}
          </NuxtLink>
        </li>
        <li v-if="bill">/</li>
        <li class="text-gray-900">議案詳情</li>
      </ol>
    </nav>

    <div v-if="error" class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 print:hidden">
      <p class="text-red-700">{{ error.message || '載入資料失敗' }}</p>
    </div>

    <div v-if="pending" class="flex items-center justify-center py-12 print:hidden">
      <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      <span class="ml-2 text-gray-600">載入中...</span>
    </div>

    <div v-if="!pending && !error && bill" class="space-y-6">
      <div
        class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none"
      >
        <p class="mb-2 text-sm font-bold text-gray-600">
          {{ formatTermLabel(bill.session) }} · {{ bill.committeeName }}
        </p>
        <h1 class="text-2xl font-bold text-gray-900">{{ bill.subject }}</h1>
      </div>

      <div
        class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm print:shadow-none"
      >
        <table class="w-full">
          <tbody>
            <tr
              v-for="field in displayFields"
              :key="field.label"
              class="block border-b last:border-b-0 sm:table-row"
            >
              <td
                class="block bg-gray-50 px-6 py-4 text-sm font-medium text-gray-900 sm:table-cell sm:w-1/4"
              >
                {{ field.label }}
              </td>
              <td class="block px-6 py-4 text-sm text-gray-700 sm:table-cell">
                <div v-if="field.key === 'attachments'" class="space-y-2">
                  <template v-if="bill.attachments.length">
                    <a
                      v-for="(attachment, index) in bill.attachments"
                      :key="attachment.id ?? index"
                      :href="normalizeUrl(attachment.url)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="block break-all text-primary-600 hover:underline"
                    >
                      {{ attachment.filename || `附件 ${index + 1}` }}
                    </a>
                  </template>
                  <span v-else>無</span>
                </div>
                <div v-else-if="field.key === 'cosponsors'">
                  {{ confirmedCosponsors.length ? confirmedCosponsors.join('、') : '無' }}
                </div>
                <div v-else-if="field.multiline" class="whitespace-pre-wrap">
                  {{ getField(field.key) || '無' }}
                </div>
                <div v-else>
                  {{ getField(field.key) || '無' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap gap-4 print:hidden">
        <NuxtLink
          :to="`/bill/${bill.session}`"
          class="inline-flex items-center rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
        >
          返回議案清單
        </NuxtLink>
        <button
          class="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-600"
          @click="copyUrl"
        >
          複製連結
        </button>
        <button
          class="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
          @click="printPage"
        >
          列印
        </button>
      </div>
    </div>

    <div
      v-if="showCopySuccess"
      class="fixed bottom-4 right-4 z-50 rounded-lg bg-green-500 px-4 py-2 text-white shadow-lg print:hidden"
    >
      連結已複製到剪貼簿
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { createError, useFetch, useHead, useRoute } from '#app';
  import type { Bill } from '~~/shared/types/bill';
  import { formatTermLabel } from '~~/shared/utils/term';

  const route = useRoute();
  const id = computed(() => parseInt(route.params.id as string, 10));

  if (!id.value || isNaN(id.value)) {
    throw createError({
      statusCode: 404,
      statusMessage: '議案參數欠缺或非數值',
    });
  }

  const { data: bill, pending, error } = await useFetch<Bill>(`/api/proposals/${id.value}`);

  const confirmedCosponsors = computed(() =>
    (bill.value?.cosponsors ?? [])
      .filter((cosponsor) => cosponsor.status === 'confirmed')
      .map((cosponsor) => cosponsor.userName)
      .filter(Boolean),
  );

  const displayFields = computed(() => [
    { label: '會期', key: 'sessionLabel' },
    { label: '委員會', key: 'committeeName' },
    { label: '提案時間', key: 'proposedAtLabel' },
    { label: '提案人', key: 'proposerName' },
    { label: '連署人', key: 'cosponsors' },
    { label: '排入會議', key: 'meetingTitle' },
    { label: '會議日期', key: 'meetingDateLabel' },
    { label: '提案截止', key: 'proposalDeadlineLabel' },
    { label: '案由', key: 'subject', multiline: true },
    { label: '說明', key: 'description', multiline: true },
    { label: '附件', key: 'attachments' },
  ]);

  useHead(() => ({
    title: bill.value?.subject ?? '議案詳情',
    meta: [
      {
        name: 'description',
        content: bill.value?.subject ?? '查看議案詳細資料。',
      },
      {
        name: 'robots',
        content: 'noindex, nofollow',
      },
    ],
  }));

  function formatDateTime(value: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getField(fieldName: string) {
    if (!bill.value) return undefined;
    if (fieldName === 'sessionLabel') return formatTermLabel(bill.value.session);
    if (fieldName === 'proposedAtLabel') return formatDateTime(bill.value.proposedAt);
    if (fieldName === 'meetingDateLabel') return formatDateTime(bill.value.meetingDate);
    if (fieldName === 'proposalDeadlineLabel') return formatDateTime(bill.value.proposalDeadlineAt);
    return (bill.value as unknown as Record<string, unknown>)[fieldName];
  }

  function normalizeUrl(value: string) {
    return value.startsWith('http') ? value : `https://${value}`;
  }

  const showCopySuccess = ref(false);

  function copyUrl() {
    if (typeof window === 'undefined') return;
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        showCopySuccess.value = true;
        setTimeout(() => {
          showCopySuccess.value = false;
        }, 2000);
      })
      .catch(() => {
        alert('複製連結失敗，請手動複製。');
      });
  }

  function printPage() {
    if (typeof window === 'undefined') return;
    window.print();
  }
</script>

<style scoped>
  .container {
    max-width: 960px;
  }
</style>
