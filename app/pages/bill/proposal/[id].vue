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
        <li v-if="bill?.meetings.length">
          <NuxtLink
            :to="`/bill/${bill.session}/meetings/${bill.meetings[0]?.id}`"
            class="hover:text-primary"
          >
            {{ bill.meetings[0]?.title }}
          </NuxtLink>
        </li>
        <li v-if="bill?.meetings.length">/</li>
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

    <div
      v-if="actionError"
      class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 print:hidden"
      role="alert"
    >
      {{ actionError }}
    </div>

    <div v-if="!pending && !error && bill" class="space-y-6">
      <div
        class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none"
      >
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="min-w-0 text-sm font-bold text-gray-600">
            {{ formatTermLabel(bill.session) }} · {{ bill.committeeName }}
          </p>
          <LoadingButton
            type="button"
            class="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            :loading="reloading"
            @click="reloadLatest"
          >
            重新整理
          </LoadingButton>
        </div>
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
              <td
                class="block px-6 text-sm text-gray-700 sm:table-cell"
                :class="editingField === field.editable ? 'py-2' : 'py-4'"
              >
                <div v-if="editingField === field.editable" class="space-y-3">
                  <select
                    v-if="field.editable === 'session'"
                    v-model="draftValue"
                    :aria-label="field.label"
                    class="edit-control"
                  >
                    <option
                      v-for="session in sessions"
                      :key="session.id"
                      :value="String(session.id)"
                    >
                      {{ session.title || formatTermLabel(session.id) }}
                    </option>
                  </select>
                  <select
                    v-else-if="field.editable === 'committeeId'"
                    v-model="draftValue"
                    :aria-label="field.label"
                    class="edit-control"
                  >
                    <option value="">無（大會）</option>
                    <option
                      v-for="committee in committees"
                      :key="committee.id"
                      :value="String(committee.id)"
                    >
                      {{ committee.name }}
                    </option>
                  </select>
                  <input
                    v-else-if="field.editable === 'proposedAt'"
                    v-model="draftValue"
                    :aria-label="field.label"
                    type="date"
                    class="edit-control"
                  />
                  <textarea
                    v-else-if="field.editable === 'subject' || field.editable === 'description'"
                    v-model="draftValue"
                    v-auto-resize
                    :aria-label="field.label"
                    rows="1"
                    class="edit-control auto-resize-textarea"
                  ></textarea>
                  <template v-else-if="field.editable === 'attachments'">
                    <div
                      v-for="(attachment, index) in attachmentDraft"
                      :key="attachment.id"
                      class="grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
                    >
                      <label class="block">
                        <span class="mb-1 block text-xs font-medium"
                          >附件 {{ index + 1 }} 名稱</span
                        >
                        <input
                          v-model="attachment.name"
                          type="text"
                          maxlength="200"
                          class="edit-control"
                        />
                      </label>
                      <label class="block">
                        <span class="mb-1 block text-xs font-medium"
                          >附件 {{ index + 1 }} 網址</span
                        >
                        <input
                          v-model="attachment.url"
                          maxlength="2048"
                          type="text"
                          inputmode="url"
                          class="edit-control"
                        />
                      </label>
                      <button
                        type="button"
                        class="rounded-lg border border-gray-300 px-2 py-2 hover:bg-gray-50"
                        :aria-label="`移除附件 ${index + 1}`"
                        @click="removeAttachment(attachment.id)"
                      >
                        移除
                      </button>
                    </div>
                    <button
                      type="button"
                      class="rounded-lg border border-primary px-3 py-2 font-semibold text-primary hover:bg-primary hover:text-white"
                      @click="addAttachment"
                    >
                      ＋ 新增附件
                    </button>
                  </template>
                </div>
                <div v-else-if="field.key === 'attachments'" class="space-y-2">
                  <template v-if="bill.attachments.length">
                    <a
                      v-for="(attachment, index) in bill.attachments"
                      :key="attachment.id ?? index"
                      :href="normalizeUrl(attachment.url)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="block break-all text-primary-600 hover:underline"
                    >
                      {{ attachment.name }}
                    </a>
                  </template>
                  <span v-else>無</span>
                </div>
                <div v-else-if="field.key === 'cosponsors'">
                  {{ confirmedCosponsors.length ? confirmedCosponsors.join('、') : '無' }}
                </div>
                <div v-else-if="field.key === 'meetingTitles'" class="space-y-1">
                  <NuxtLink
                    v-for="meeting in bill.meetings"
                    :key="meeting.id"
                    :to="`/bill/${bill.session}/meetings/${meeting.id}`"
                    class="block text-primary hover:underline"
                  >
                    {{ meeting.title }}
                  </NuxtLink>
                  <span v-if="!bill.meetings.length">尚未排入會議</span>
                </div>
                <div v-else-if="field.multiline" class="whitespace-pre-wrap">
                  {{ getField(field.key) || '無' }}
                </div>
                <div v-else>
                  {{
                    getField(field.key) || (field.key === 'meetingTitles' ? '尚未排入會議' : '無')
                  }}
                </div>
              </td>
              <td
                v-if="isSecretariat"
                class="block px-3 py-3 text-right sm:table-cell sm:w-24 print:hidden"
              >
                <div v-if="field.editable" class="flex justify-end gap-1">
                  <template v-if="editingField === field.editable">
                    <button
                      type="button"
                      class="rounded-lg p-2 text-green-700 hover:bg-green-50 disabled:opacity-50"
                      :disabled="isSaving"
                      :aria-label="`儲存${field.label}`"
                      @click="saveField"
                    >
                      <CheckIcon class="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                      :disabled="isSaving"
                      :aria-label="`取消編輯${field.label}`"
                      @click="cancelEditing"
                    >
                      <XMarkIcon class="h-5 w-5" />
                    </button>
                  </template>
                  <button
                    v-else
                    type="button"
                    class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    :disabled="
                      isSaving ||
                      editingField !== null ||
                      (bill.meetings.length > 0 &&
                        (field.editable === 'session' || field.editable === 'committeeId'))
                    "
                    :aria-label="`編輯${field.label}`"
                    :title="
                      bill.meetings.length > 0 &&
                      (field.editable === 'session' || field.editable === 'committeeId')
                        ? '請先到議案排案取消排入會議'
                        : undefined
                    "
                    @click="startEditing(field.editable)"
                  >
                    <PencilIcon class="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap gap-4 print:hidden">
        <NuxtLink
          :to="
            bill.meetings.length
              ? `/bill/${bill.session}/meetings/${bill.meetings[0]?.id}`
              : `/bill/${bill.session}`
          "
          class="inline-flex items-center rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
        >
          {{ bill.meetings.length ? '返回會議議案' : '返回會期會議' }}
        </NuxtLink>
        <button
          type="button"
          class="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-600"
          @click="copyUrl"
        >
          複製連結
        </button>
        <LoadingButton
          v-if="isSecretariat"
          type="button"
          :loading="isDeleting"
          loading-label="刪除議案中"
          class="ml-auto inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-white transition-colors hover:bg-red-800 disabled:opacity-50"
          @click="deleteBill"
        >
          刪除議案
        </LoadingButton>
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
  import { CheckIcon, PencilIcon, XMarkIcon } from '@heroicons/vue/24/outline';
  import type {
    Bill,
    Committee,
    ProposalAttachmentInput,
    ProposalEditableField,
    Session,
  } from '~~/shared/types/bill';
  import { proposalTypeLabels } from '~~/shared/types/bill';
  import { formatTermLabel } from '~~/shared/utils/term';
  import { normalizeAttachmentUrl } from '~~/shared/utils/attachment';
  import { vAutoResize } from '~/utils/autoResizeTextarea';

  interface DisplayField {
    label: string;
    key: string;
    editable?: ProposalEditableField;
    multiline?: boolean;
  }

  interface AttachmentDraft extends ProposalAttachmentInput {
    id: number;
  }

  const route = useRoute();
  const id = computed(() => parseInt(route.params.id as string, 10));

  if (!id.value || isNaN(id.value)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: '議案參數欠缺或非數值',
    });
  }

  const [
    { data: bill, pending, error },
    { data: authSession, refresh: refreshSession },
    { data: sessionsData },
    { data: committeesData },
  ] = await Promise.all([
    usePrefetchableFetch<Bill>(`/api/proposals/${id.value}`),
    useFetch<{ role?: string }>('/api/secretariat/session'),
    useSessions(),
    useCommittees(),
  ]);
  const isSecretariat = computed(() => authSession.value?.role === 'secretariat_admin');
  const sessions = computed(() => sessionsData.value ?? []);
  const committees = computed(() => committeesData.value ?? []);
  const editingField = ref<ProposalEditableField | null>(null);
  const draftValue = ref('');
  const attachmentDraft = ref<AttachmentDraft[]>([]);
  const isSaving = ref(false);
  const isDeleting = ref(false);
  const actionError = ref('');
  let nextAttachmentId = 1;

  onMounted(() => {
    refreshSession();
  });

  // Public reads come from a short-lived edge cache; this skips it so live meeting changes show at once.
  const reloading = ref(false);
  async function reloadLatest() {
    reloading.value = true;
    try {
      bill.value = await $fetch<Bill>(`/api/proposals/${id.value}`, FRESH_FETCH_OPTIONS);
    } catch (error) {
      console.error('取得最新資料失敗:', error);
    } finally {
      reloading.value = false;
    }
  }

  const confirmedCosponsors = computed(() =>
    (bill.value?.cosponsors ?? []).map((cosponsor) => cosponsor.userName).filter(Boolean),
  );

  const displayFields: DisplayField[] = [
    { label: '案型', key: 'proposalTypeLabel' },
    { label: '會期', key: 'sessionLabel', editable: 'session' },
    { label: '委員會', key: 'committeeName', editable: 'committeeId' },
    { label: '提案日期', key: 'proposedAtLabel', editable: 'proposedAt' },
    { label: '提案人', key: 'proposerName' },
    { label: '連署人', key: 'cosponsors' },
    { label: '排入會議', key: 'meetingTitles' },
    { label: '會議日期', key: 'meetingDates' },
    { label: '提案截止', key: 'proposalDeadlines' },
    { label: '案由', key: 'subject', editable: 'subject', multiline: true },
    { label: '說明', key: 'description', editable: 'description', multiline: true },
    { label: '附件', key: 'attachments', editable: 'attachments' },
  ];

  useHead(() => ({
    title: bill.value?.subject ?? '議案詳情',
    meta: [
      {
        name: 'description',
        content: bill.value?.subject ?? '查看議案詳細資料。',
      },
      ...(!bill.value?.meetings.length ? [{ name: 'robots', content: 'noindex' }] : []),
    ],
  }));

  function formatDateTime(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
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

  function getField(fieldName: string) {
    if (!bill.value) return undefined;
    if (fieldName === 'proposalTypeLabel') return proposalTypeLabels[bill.value.proposalType];
    if (fieldName === 'sessionLabel') return formatTermLabel(bill.value.session);
    if (fieldName === 'proposedAtLabel') return formatDate(bill.value.proposedAt);
    if (fieldName === 'meetingTitles')
      return bill.value.meetings.map((meeting) => meeting.title).join('、');
    if (fieldName === 'meetingDates')
      return bill.value.meetings.map((meeting) => formatDateTime(meeting.meetingDate)).join('、');
    if (fieldName === 'proposalDeadlines')
      return bill.value.meetings
        .map((meeting) => formatDateTime(meeting.proposalDeadlineAt))
        .join('、');
    return (bill.value as unknown as Record<string, unknown>)[fieldName];
  }

  function normalizeUrl(value: string) {
    return normalizeAttachmentUrl(value) ?? '#';
  }

  function startEditing(field: ProposalEditableField | undefined) {
    if (!bill.value || !field || !isSecretariat.value || editingField.value !== null) return;
    if (bill.value.meetings.length > 0 && (field === 'session' || field === 'committeeId')) return;

    actionError.value = '';
    editingField.value = field;
    switch (field) {
      case 'session':
        draftValue.value = String(bill.value.session);
        break;
      case 'committeeId':
        draftValue.value = bill.value.committeeId === null ? '' : String(bill.value.committeeId);
        break;
      case 'proposedAt':
        draftValue.value = bill.value.proposedAt.slice(0, 10);
        break;
      case 'subject':
      case 'description':
        draftValue.value =
          field === 'subject' ? bill.value.subjectTemplate : bill.value.descriptionTemplate;
        break;
      case 'attachments':
        attachmentDraft.value = bill.value.attachments.map((attachment, index) => ({
          id: index + 1,
          name: attachment.name,
          url: attachment.url,
        }));
        nextAttachmentId = attachmentDraft.value.length + 1;
        break;
    }
  }

  function cancelEditing() {
    editingField.value = null;
    draftValue.value = '';
    attachmentDraft.value = [];
    actionError.value = '';
  }

  function addAttachment() {
    attachmentDraft.value.push({ id: nextAttachmentId++, name: '', url: '' });
  }

  function removeAttachment(id: number) {
    attachmentDraft.value = attachmentDraft.value.filter((attachment) => attachment.id !== id);
  }

  function attachmentValue(): ProposalAttachmentInput[] {
    const attachments: ProposalAttachmentInput[] = [];
    for (const [index, attachment] of attachmentDraft.value.entries()) {
      const name = attachment.name.trim();
      const rawUrl = attachment.url.trim();
      if (!name && !rawUrl) continue;

      const url = normalizeAttachmentUrl(rawUrl);
      if (!name || !url) {
        throw new Error(`附件 ${index + 1} 需要名稱與有效網址`);
      }
      attachments.push({ name, url });
    }
    return attachments;
  }

  async function saveField() {
    if (!bill.value || !editingField.value || !isSecretariat.value) return;

    actionError.value = '';
    isSaving.value = true;

    try {
      const field = editingField.value;
      let value: unknown = draftValue.value;
      if (field === 'attachments') value = attachmentValue();
      if (field === 'session') value = Number(draftValue.value);
      if (field === 'committeeId') {
        value = draftValue.value === '' ? null : Number(draftValue.value);
      }

      const updated = await $fetch<Bill>(`/api/proposals/${bill.value.id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        body: { field, value },
      });
      bill.value = updated;
      cancelEditing();
    } catch (error) {
      const response = error as { data?: { message?: string; statusMessage?: string } };
      actionError.value =
        response.data?.message ||
        response.data?.statusMessage ||
        (error instanceof Error ? error.message : '儲存失敗，請稍後再試。');
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteBill() {
    if (!bill.value || !isSecretariat.value) return;
    const target = bill.value;
    if (!window.confirm(`確定永久刪除「${target.subject}」嗎？此操作無法復原。`)) return;

    actionError.value = '';
    isDeleting.value = true;
    try {
      await $fetch(`/api/proposals/${target.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      window.location.assign(`/bill/${target.session}`);
    } catch (error) {
      const response = error as { data?: { message?: string; statusMessage?: string } };
      actionError.value =
        response.data?.message || response.data?.statusMessage || '刪除失敗，請稍後再試。';
      isDeleting.value = false;
    }
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
</script>

<style scoped>
  .container {
    max-width: 960px;
  }

  .edit-control {
    @apply block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30;
  }
</style>
