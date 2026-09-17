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
      <p class="text-gray-600">提案送出後即為正式提案，截止時間依所選會議設定。</p>
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
          <span class="mb-1 block text-sm font-medium text-gray-700">提案時間</span>
          <input v-model="form.proposedAt" required type="datetime-local" class="form-input" />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">提案人</span>
          <select v-model="form.proposerId" required class="form-input">
            <option value="">請選擇提案人</option>
            <option v-for="user in eligibleUsers" :key="user.id" :value="String(user.id)">
              {{ user.name }}（{{ user.email }}）
            </option>
          </select>
        </label>
      </div>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">排入會議</span>
        <select v-model="form.meetingId" required class="form-input">
          <option value="">請選擇會議</option>
          <option v-for="meeting in eligibleMeetings" :key="meeting.id" :value="String(meeting.id)">
            {{ meeting.title }}，截止
            {{ formatDateTime(meeting.proposalDeadlineAt) }}
          </option>
        </select>
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">連署人</span>
        <select v-model="form.cosponsorIds" multiple class="form-input min-h-36">
          <option v-for="user in cosponsorOptions" :key="user.id" :value="String(user.id)">
            {{ user.name }}（{{ user.email }}）
          </option>
        </select>
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">案由</span>
        <textarea v-model="form.subject" rows="3" required class="form-textarea"></textarea>
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">說明</span>
        <textarea v-model="form.description" rows="7" class="form-textarea"></textarea>
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">附件連結</span>
        <textarea
          v-model="attachmentsInput"
          rows="4"
          class="form-textarea"
          placeholder="一行一個 URL；檔案上傳到 R2 的流程之後再接"
        ></textarea>
      </label>

      <div
        v-if="errorMessage"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ errorMessage }}
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
          :disabled="isSubmitting"
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
  import { computed, reactive, ref, watch } from 'vue';
  import { parseTermCode, getCurrentTerm } from '~~/shared/utils/term';
  import type {
    Bill,
    Committee,
    Meeting,
    ProposalInput,
    Session,
    User,
  } from '~~/shared/types/bill';

  definePageMeta({
    title: '新增議案',
    middleware: ['auth'],
  });

  interface BillForm {
    committeeId: string;
    session: string;
    proposedAt: string;
    proposerId: string;
    meetingId: string;
    cosponsorIds: string[];
    subject: string;
    description: string;
  }

  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const form = reactive<BillForm>({
    committeeId: '',
    session: String(getCurrentTerm()),
    proposedAt: localNow,
    proposerId: '',
    meetingId: '',
    cosponsorIds: [],
    subject: '',
    description: '',
  });

  const attachmentsInput = ref('');
  const isSubmitting = ref(false);
  const errorMessage = ref('');
  const savedBill = ref<Bill | null>(null);

  const { data: committeesData } = await useFetch<Committee[]>('/api/committees');
  const { data: sessionsData } = await useFetch<Session[]>('/api/sessions');
  const { data: usersData } = await useFetch<User[]>('/api/users');
  const { data: meetingsData } = await useFetch<Meeting[]>('/api/meetings');

  const committees = computed(() => committeesData.value ?? []);
  const sessions = computed(() => sessionsData.value ?? []);
  const users = computed(() => usersData.value ?? []);
  const meetings = computed(() => meetingsData.value ?? []);

  if (sessions.value.some((session) => session.id === getCurrentTerm())) {
    form.session = String(getCurrentTerm());
  } else {
    form.session = sessions.value[0]?.id ? String(sessions.value[0].id) : '';
  }

  const selectedCommitteeId = computed(() => Number(form.committeeId) || null);
  const selectedSession = computed(() => parseTermCode(form.session));

  const eligibleUsers = computed(() => {
    const legislators = users.value.filter((user) => user.permissionRole === 'legislator');

    if (!selectedCommitteeId.value) return legislators;
    return legislators.filter(
      (user) =>
        user.committeeIds.length === 0 || user.committeeIds.includes(selectedCommitteeId.value!),
    );
  });

  const eligibleMeetings = computed(() => {
    const deadlineBase = new Date(form.proposedAt).getTime();

    return meetings.value.filter((meeting) => {
      if (meeting.committeeId !== selectedCommitteeId.value) return false;
      if (selectedSession.value && meeting.session !== selectedSession.value) return false;

      const deadline = new Date(meeting.proposalDeadlineAt).getTime();
      return Number.isNaN(deadline) || Number.isNaN(deadlineBase) || deadlineBase <= deadline;
    });
  });

  const cosponsorOptions = computed(() =>
    eligibleUsers.value.filter((user) => String(user.id) !== form.proposerId),
  );

  const billLink = computed(() => {
    if (!savedBill.value) return '/bill';
    return `/bill/proposal/${savedBill.value.id}`;
  });

  watch(
    () => [form.committeeId, form.session, form.proposedAt],
    () => {
      if (!eligibleMeetings.value.some((meeting) => String(meeting.id) === form.meetingId)) {
        form.meetingId = '';
      }
    },
  );

  watch(
    () => form.proposerId,
    () => {
      form.cosponsorIds = form.cosponsorIds.filter((id) => id !== form.proposerId);
    },
  );

  function formatDateTime(value: string) {
    if (!value) return '未設定';
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

  function buildPayload(): ProposalInput {
    const session = parseTermCode(form.session);

    if (!session) {
      throw new Error('會期格式錯誤');
    }

    return {
      committeeId: selectedCommitteeId.value,
      session,
      proposedAt: new Date(form.proposedAt).toISOString(),
      proposerId: Number(form.proposerId),
      meetingId: Number(form.meetingId),
      subject: form.subject.trim(),
      description: form.description.trim(),
      attachments: attachmentsInput.value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      cosponsorIds: form.cosponsorIds.map(Number).filter((id) => Number.isInteger(id) && id > 0),
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
    @apply block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30;
  }
</style>
