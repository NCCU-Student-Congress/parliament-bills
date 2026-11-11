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
        <li class="text-gray-900">新增議案</li>
      </ol>
    </nav>

    <div class="mb-8">
      <h1 class="mb-2 text-3xl font-bold text-gray-900">新增議案</h1>
      <p class="text-gray-600">提案送出後即為正式提案，由秘書處安排議案所屬會議。</p>
    </div>

    <form
      class="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      @submit.prevent="submitBill"
    >
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">委員會</span>
          <select v-model="form.committeeId" class="form-input">
            <option value="">無（大會）</option>
            <option
              v-for="committee in committees"
              :key="committee.id"
              :value="String(committee.id)"
            >
              {{ committee.name }}
            </option>
          </select>
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">會期</span>
          <select v-model="form.session" required class="form-input">
            <option value="">請選擇會期</option>
            <option v-for="session in sessions" :key="session.id" :value="String(session.id)">
              {{ session.title }}
            </option>
          </select>
        </label>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">提案日期</span>
          <input v-model="form.proposedAt" required type="date" class="form-input" />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">提案人</span>
          <div class="form-input">{{ proposerLabel }}</div>
        </label>
      </div>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">案由</span>
        <textarea v-model="form.subject" rows="3" required class="form-textarea"></textarea>
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">說明</span>
        <textarea v-model="form.description" rows="7" class="form-textarea"></textarea>
      </label>

      <section aria-labelledby="attachments-heading" class="space-y-3">
        <div>
          <h2 id="attachments-heading" class="text-sm font-medium text-gray-700">附件連結</h2>
          <p class="mt-1 text-sm text-gray-500">如有附件，請填寫名稱與連結。</p>
        </div>

        <div
          v-for="(attachment, index) in attachmentRows"
          :key="attachment.id"
          class="rounded-lg border border-gray-200 p-4"
        >
          <div class="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-gray-700"
                >附件 {{ index + 1 }} 名稱</span
              >
              <input
                v-model="attachment.name"
                type="text"
                class="form-input"
                placeholder="例如：議案附件"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-gray-700"
                >附件 {{ index + 1 }} 網址</span
              >
              <input
                v-model="attachment.url"
                type="text"
                inputmode="url"
                class="form-input"
                placeholder="https://example.com/document"
                @blur="normalizeAttachmentRow(attachment)"
              />
            </label>
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              :aria-label="`移除附件 ${index + 1}`"
              @click="removeAttachmentRow(attachment.id)"
            >
              移除
            </button>
          </div>
          <p v-if="attachmentErrors[attachment.id]" class="mt-2 text-sm text-red-700" role="alert">
            {{ attachmentErrors[attachment.id] }}
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white"
          @click="addAttachmentRow"
        >
          ＋ 新增附件
        </button>
      </section>

      <div
        v-if="errorMessage || formDataError"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ errorMessage || '無法載入登入者資料，請重新登入。' }}
      </div>

      <div
        v-if="savedBill"
        class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
      >
        <p>已寫入：{{ savedBill.subject }}</p>
        <NuxtLink :to="billLink" class="mt-2 inline-flex text-primary-600 hover:underline">
          查看議案
        </NuxtLink>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="submit"
          :disabled="isSubmitting || !proposer"
          class="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isSubmitting ? '寫入中...' : '送出提案' }}
        </button>
        <NuxtLink
          to="/bill"
          class="inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
        >
          返回議案查詢
        </NuxtLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from 'vue';
  import { parseTermCode, getCurrentTerm } from '~~/shared/utils/term';
  import { normalizeAttachmentUrl } from '~~/shared/utils/attachment';
  import type {
    Bill,
    Committee,
    ProposalAttachmentInput,
    ProposalInput,
    Session,
    User,
  } from '~~/shared/types/bill';

  interface ProposalFormData {
    proposer: Pick<User, 'name' | 'permissionRole'>;
  }

  definePageMeta({
    title: '新增議案',
    middleware: ['auth'],
  });

  interface BillForm {
    committeeId: string;
    session: string;
    proposedAt: string;
    subject: string;
    description: string;
  }

  interface AttachmentRowInput extends ProposalAttachmentInput {
    id: number;
  }

  const localToday = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const form = reactive<BillForm>({
    committeeId: '',
    session: String(getCurrentTerm()),
    proposedAt: localToday,
    subject: '',
    description: '',
  });

  const attachmentRows = ref<AttachmentRowInput[]>([{ id: 0, name: '', url: '' }]);
  const attachmentErrors = ref<Record<number, string>>({});
  let nextAttachmentId = 1;
  const isSubmitting = ref(false);
  const errorMessage = ref('');
  const savedBill = ref<Bill | null>(null);

  const { data: committeesData } = await useFetch<Committee[]>('/api/committees');
  const { data: sessionsData } = await useFetch<Session[]>('/api/sessions');
  const { data: formData, error: formDataError } = await useFetch<ProposalFormData>(
    '/api/proposals/form-data',
  );

  const committees = computed(() => committeesData.value ?? []);
  const sessions = computed(() => sessionsData.value ?? []);
  const proposer = computed(() => formData.value?.proposer);
  const proposerLabel = computed(() => {
    if (!proposer.value) return '載入中...';
    const role = proposer.value.permissionRole === 'secretariat_admin' ? '秘書處' : '議員';
    return `${proposer.value.name}（${role}）`;
  });

  if (sessions.value.some((session) => session.id === getCurrentTerm())) {
    form.session = String(getCurrentTerm());
  } else {
    form.session = sessions.value[0]?.id ? String(sessions.value[0].id) : '';
  }

  const selectedCommitteeId = computed(() => Number(form.committeeId) || null);
  const billLink = computed(() => {
    if (!savedBill.value) return '/bill';
    return `/bill/proposal/${savedBill.value.id}`;
  });

  function addAttachmentRow() {
    attachmentRows.value.push({ id: nextAttachmentId++, name: '', url: '' });
  }

  function removeAttachmentRow(id: number) {
    attachmentRows.value = attachmentRows.value.filter((row) => row.id !== id);
    delete attachmentErrors.value[id];
  }

  function normalizeAttachmentRow(row: AttachmentRowInput) {
    const url = normalizeAttachmentUrl(row.url);
    if (url) row.url = url;
  }

  function buildPayload(): Omit<ProposalInput, 'proposerId'> {
    const session = parseTermCode(form.session);

    if (!session) {
      throw new Error('會期格式錯誤');
    }

    attachmentErrors.value = {};
    const attachments: ProposalAttachmentInput[] = [];
    for (const [index, row] of attachmentRows.value.entries()) {
      const name = row.name.trim();
      const rawUrl = row.url.trim();
      if (!name && !rawUrl) continue;

      const url = normalizeAttachmentUrl(rawUrl);
      if (!name || !url) {
        attachmentErrors.value[row.id] = `附件 ${index + 1} 需要名稱與有效網址`;
        continue;
      }

      attachments.push({ name, url });
    }

    if (Object.keys(attachmentErrors.value).length) {
      throw new Error('請檢查附件欄位');
    }

    return {
      committeeId: selectedCommitteeId.value,
      session,
      proposedAt: form.proposedAt,
      subject: form.subject.trim(),
      description: form.description.trim(),
      attachments,
    };
  }

  async function submitBill() {
    errorMessage.value = '';
    savedBill.value = null;
    isSubmitting.value = true;

    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.statusMessage || '寫入失敗');
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
    @apply block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30;
  }
</style>
