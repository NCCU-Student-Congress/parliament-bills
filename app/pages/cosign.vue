<template>
  <div class="container mx-auto px-4 py-8">
    <nav class="mb-6 text-sm text-gray-600">
      <NuxtLink to="/" class="hover:text-primary">首頁</NuxtLink>
      <span class="mx-2">/</span>
      <span class="text-gray-900">連署</span>
    </nav>

    <div class="mb-8">
      <h1 class="mb-2 text-3xl font-bold text-gray-900">連署</h1>
      <p class="text-gray-600">議案排入會議前，議員可以連署其他人的討論案或選舉案。</p>
      <p v-if="!session?.authenticated" class="mt-3 text-sm text-gray-600">
        議員可<NuxtLink
          to="/secretariat/login?redirect=/cosign"
          class="font-semibold text-primary hover:underline"
          >登入</NuxtLink
        >後連署。
      </p>
    </div>

    <div
      v-if="errorMessage"
      class="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
    >
      {{ errorMessage }}
    </div>

    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
      無法載入可連署的議案，請稍後再試。
    </div>
    <div v-else-if="pending" class="py-12 text-center text-gray-600">載入中...</div>
    <div
      v-else-if="!bills?.length"
      class="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600"
    >
      目前沒有可連署的議案。
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="bill in bills"
        :key="bill.id"
        class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="mb-2 text-sm font-semibold text-gray-600">
              {{ formatTermLabel(bill.session) }} · {{ bill.committeeName }} ·
              {{ formatDate(bill.proposedAt) }}
            </p>
            <ProposalTypePill :proposal-type="bill.proposalType" class="mb-2" />
            <h2 class="text-xl font-bold text-gray-900">
              <NuxtLink
                :to="`/bill/proposal/${bill.id}`"
                class="hover:text-primary hover:underline"
              >
                {{ bill.subject }}
              </NuxtLink>
            </h2>
            <p class="mt-3 text-sm text-gray-700">
              提案人：{{ bill.proposerName }} · 已連署 {{ confirmedCount(bill) }} 人
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-3">
            <span v-if="hasSigned(bill)" class="text-sm font-semibold text-green-700">已連署</span>
            <span
              v-else-if="session?.role === 'legislator' && bill.proposerId === session.userId"
              class="text-sm text-gray-500"
            >
              您的提案
            </span>
            <button
              v-else-if="canSign(bill)"
              type="button"
              :disabled="submittingId === bill.id"
              class="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
              @click="cosign(bill.id)"
            >
              {{ submittingId === bill.id ? '連署中...' : '連署' }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import type { Bill } from '~~/shared/types/bill';
  import type { PermissionRole } from '~~/shared/types/auth';
  import { formatTermLabel } from '~~/shared/utils/term';

  interface SessionState {
    authenticated: boolean;
    userId?: number;
    role?: PermissionRole;
  }

  definePageMeta({
    title: '連署',
    description: '查看尚未排入會議、目前開放連署的學生議會議案。',
  });

  const {
    data: bills,
    pending,
    error,
    refresh,
  } = await useFetch<Bill[]>('/api/proposals/signable');
  const { data: session, refresh: refreshSession } = await useFetch<SessionState>(
    '/api/secretariat/session',
  );
  const submittingId = ref<number | null>(null);
  const errorMessage = ref('');

  onMounted(() => {
    refreshSession();
  });

  function confirmedCount(bill: Bill) {
    return bill.cosponsors.filter((cosponsor) => cosponsor.status === 'confirmed').length;
  }

  function hasSigned(bill: Bill) {
    return bill.cosponsors.some(
      (cosponsor) => cosponsor.userId === session.value?.userId && cosponsor.status === 'confirmed',
    );
  }

  function canSign(bill: Bill) {
    return (
      session.value?.role === 'legislator' &&
      bill.proposalType !== 'report' &&
      bill.proposerId !== session.value.userId &&
      !hasSigned(bill)
    );
  }

  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  async function cosign(id: number) {
    errorMessage.value = '';
    submittingId.value = id;

    try {
      const updated = await $fetch<Bill>(`/api/proposals/${id}/cosponsors`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      bills.value = (bills.value ?? [])
        .map((bill) => (bill.id === id ? updated : bill))
        .filter((bill) => bill.meetings.length === 0);
    } catch (error) {
      const response = error as { data?: { message?: string; statusMessage?: string } };
      errorMessage.value =
        response.data?.message || response.data?.statusMessage || '連署失敗，請稍後再試。';
      await refresh();
    } finally {
      submittingId.value = null;
    }
  }
</script>

<style scoped>
  .container {
    max-width: 960px;
  }
</style>
