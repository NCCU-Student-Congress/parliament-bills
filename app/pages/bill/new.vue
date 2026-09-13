<template>
  <div class="container mx-auto px-4 py-8">
    <nav class="mb-6">
      <ol class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
        <li>
          <NuxtLink to="/" class="hover:text-primary">首頁</NuxtLink>
        </li>
        <li>/</li>
        <li>
          <NuxtLink to="/bill" class="hover:text-primary">議案查詢</NuxtLink>
        </li>
        <li>/</li>
        <li class="text-gray-900 dark:text-white">新增議案</li>
      </ol>
    </nav>

    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">新增議案</h1>
      <p class="text-gray-600 dark:text-gray-300">依既有議案資料格式寫入 D1。</p>
    </div>

    <form
      class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6"
      @submit.prevent="submitBill"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label class="block">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            總流水號
          </span>
          <input
            v-model="form.rowIndex"
            type="number"
            min="1"
            class="form-input"
            placeholder="留空自動產生"
          />
        </label>

        <label class="block md:col-span-2">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            編號
          </span>
          <input
            v-model="form.billNumber"
            type="text"
            class="form-input"
            placeholder="27屆北大峽議字第1號"
          />
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label class="block">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            屆次
          </span>
          <input v-model="form.term" type="number" min="1" class="form-input" />
        </label>

        <label class="block">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            屆內流水號
          </span>
          <input v-model="form.serialNumber" type="number" min="1" class="form-input" />
        </label>

        <label class="block">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            提案時間
          </span>
          <input
            v-model="form.submittedAt"
            type="text"
            class="form-input"
            placeholder="2026/7/6 上午 1:53:50"
          />
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label class="block">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            提案機關/議員
          </span>
          <input v-model="form.proposingEntity" type="text" class="form-input" />
        </label>

        <label class="block">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            提案機關主管/提案議員姓名
          </span>
          <input v-model="form.proposerName" type="text" class="form-input" />
        </label>

        <label class="block">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            提案聯絡人姓名
          </span>
          <input v-model="form.contactName" type="text" class="form-input" />
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="block">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            提案類型
          </span>
          <input v-model="form.billType" type="text" class="form-input" />
        </label>

        <label class="block">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            排入會議
          </span>
          <input v-model="form.scheduledSession" type="text" class="form-input" />
        </label>
      </div>

      <label class="block">
        <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">案由</span>
        <textarea v-model="form.subject" rows="3" required class="form-textarea"></textarea>
      </label>

      <label class="block">
        <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">說明</span>
        <textarea v-model="form.description" rows="6" class="form-textarea"></textarea>
      </label>

      <label class="block">
        <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">辦法</span>
        <textarea v-model="form.proposedAction" rows="5" class="form-textarea"></textarea>
      </label>

      <label class="block">
        <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"> 附件 </span>
        <textarea
          v-model="attachmentsInput"
          rows="4"
          class="form-textarea"
          placeholder="一行一個 URL"
        ></textarea>
      </label>

      <div
        v-if="errorMessage"
        class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="savedBill"
        class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300"
      >
        <p>已寫入：{{ savedBill.billNumber || `第 ${savedBill.rowIndex} 號議案` }}</p>
        <NuxtLink
          :to="billLink"
          class="inline-flex mt-2 text-primary-600 dark:text-primary-400 hover:underline"
        >
          查看議案
        </NuxtLink>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="submit"
          :disabled="isSubmitting"
          class="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {{ isSubmitting ? '寫入中...' : '寫入議案' }}
        </button>
        <NuxtLink
          to="/bill"
          class="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          返回議案查詢
        </NuxtLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from 'vue';
  import type { Bill } from '~~/shared/types/bill';

  definePageMeta({
    title: '新增議案',
  });

  interface BillForm {
    rowIndex: string;
    billNumber: string;
    term: string;
    serialNumber: string;
    submittedAt: string;
    proposingEntity: string;
    proposerName: string;
    contactName: string;
    billType: string;
    subject: string;
    description: string;
    proposedAction: string;
    scheduledSession: string;
  }

  const form = reactive<BillForm>({
    rowIndex: '',
    billNumber: '',
    term: '',
    serialNumber: '',
    submittedAt: '',
    proposingEntity: '',
    proposerName: '',
    contactName: '',
    billType: '',
    subject: '',
    description: '',
    proposedAction: '',
    scheduledSession: '',
  });

  const attachmentsInput = ref('');
  const isSubmitting = ref(false);
  const errorMessage = ref('');
  const savedBill = ref<Bill | null>(null);

  const billLink = computed(() => {
    if (!savedBill.value) return '/bill';
    if (savedBill.value.billNumber && savedBill.value.term && savedBill.value.serialNumber) {
      return `/bill/${savedBill.value.term}/${savedBill.value.serialNumber}`;
    }
    return `/bill/unnumbered/${savedBill.value.rowIndex}`;
  });

  function toOptionalNumber(value: string): number | null {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function buildPayload(): Partial<Bill> {
    return {
      rowIndex: toOptionalNumber(form.rowIndex) ?? undefined,
      billNumber: form.billNumber.trim(),
      term: toOptionalNumber(form.term),
      serialNumber: toOptionalNumber(form.serialNumber),
      submittedAt: form.submittedAt.trim(),
      proposingEntity: form.proposingEntity.trim(),
      proposerName: form.proposerName.trim(),
      contactName: form.contactName.trim(),
      billType: form.billType.trim(),
      subject: form.subject.trim(),
      description: form.description.trim(),
      proposedAction: form.proposedAction.trim(),
      attachments: attachmentsInput.value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      scheduledSession: form.scheduledSession.trim(),
    };
  }

  async function submitBill() {
    errorMessage.value = '';
    savedBill.value = null;
    isSubmitting.value = true;

    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.statusMessage || data?.message || '寫入失敗');
      }

      savedBill.value = data as Bill;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '寫入失敗';
    } finally {
      isSubmitting.value = false;
    }
  }
</script>

<style scoped>
  .container {
    max-width: 960px;
  }

  .form-input,
  .form-textarea {
    @apply block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30;
  }
</style>
