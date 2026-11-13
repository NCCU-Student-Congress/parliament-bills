<template>
  <section class="admin-section">
    <div class="mb-5">
      <h2 class="text-xl font-bold">設定議程</h2>
      <p class="mt-1 text-sm text-gray-600">
        選擇會議後拖曳項目排序或插入文字；修改後會自動儲存，並顯示在會議查詢。
      </p>
    </div>
    <label class="mb-5 block font-semibold" for="agenda-meeting"
      >會議
      <select id="agenda-meeting" v-model.number="meetingId" class="control mt-2 w-full">
        <option :value="0">請選擇會議</option>
        <option v-for="meeting in meetings" :key="meeting.id" :value="meeting.id">
          {{ meeting.title }}（{{ meeting.meetingTypeName }}）
        </option>
      </select>
    </label>
    <p v-if="loading" class="py-6 text-gray-600">載入議程中...</p>
    <p v-else-if="loadError" class="py-4 text-red-700">{{ loadError }}</p>
    <template v-else-if="selectedMeeting">
      <p v-if="newProposals.length" class="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        有 {{ newProposals.length }} 筆已排入的議案尚未加入議程，可在此加入並拖曳至適當位置。
      </p>
      <div v-if="newProposals.length" class="mb-5 flex flex-wrap gap-2">
        <button
          v-for="proposal in newProposals"
          :key="proposal.id"
          type="button"
          class="rounded border border-amber-500 px-3 py-1 text-sm hover:bg-amber-50"
          @click="addProposal(proposal.id)"
        >
          ＋ {{ proposal.subject }}
        </button>
      </div>
      <p class="mb-4 text-sm text-gray-600">段落標題固定；可在各段落下方插入文字或調整議案順序。</p>
      <button
        v-if="!hasElectionSection"
        type="button"
        class="mb-4 rounded border border-gray-400 px-3 py-1.5 text-sm font-semibold"
        @click="addElectionText"
      >
        ＋插入選舉事項文字
      </button>
      <ol class="space-y-3" aria-label="議程排序">
        <li
          v-for="(entry, index) in entries"
          :key="entryKeys[index]"
          class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
          @dragover.prevent
          @drop.prevent="moveEntry(dragIndex, index)"
        >
          <div class="flex items-start gap-3">
            <span
              v-if="entry.kind !== 'heading'"
              draggable="true"
              class="cursor-grab select-none pt-2 text-gray-500"
              aria-hidden="true"
              @dragstart="startDrag($event, index)"
              @dragend="dragIndex = -1"
              >☰</span
            >
            <div class="min-w-0 flex-1">
              <span class="mb-1 block text-xs font-semibold text-gray-500">{{
                entry.kind === 'proposal'
                  ? '議案'
                  : entry.kind === 'heading'
                    ? '段落標題'
                    : '文字項目'
              }}</span>
              <p v-if="entry.kind === 'heading'" class="py-1 font-bold">{{ entry.content }}</p>
              <p v-else-if="entry.kind === 'proposal'" class="py-1 font-medium">
                {{ proposalMap.get(entry.proposalId ?? -1)?.subject || '議案已移出會議' }}
              </p>
              <textarea
                v-else
                v-model="entry.content"
                rows="2"
                class="control w-full"
                :aria-label="`第 ${index + 1} 項內容`"
              />
            </div>
            <div v-if="entry.kind !== 'heading'" class="flex flex-col gap-1 text-sm">
              <button
                type="button"
                :disabled="index === 0"
                aria-label="上移"
                @click="moveEntry(index, index - 1)"
              >
                ↑
              </button>
              <button
                type="button"
                :disabled="index === entries.length - 1"
                aria-label="下移"
                @click="moveEntry(index, index + 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="text-red-700"
                aria-label="移除"
                @click="removeEntry(index)"
              >
                ×
              </button>
            </div>
          </div>
          <button
            type="button"
            class="mt-2 text-sm text-primary hover:underline"
            @click="insertEntry(index + 1)"
          >
            ＋在此處插入文字
          </button>
        </li>
      </ol>
      <div class="mt-6 flex items-center gap-3">
        <button type="button" class="btn btn-primary" :disabled="saving" @click="queueSave()">
          {{ saving ? '儲存中...' : '立即儲存' }}
        </button>
        <NuxtLink
          :to="`/bill/${selectedMeeting.session}/meetings/${selectedMeeting.id}`"
          class="text-primary hover:underline"
          >查看會議頁</NuxtLink
        >
      </div>
      <p v-if="saveNotice" role="status" class="mt-3 text-sm text-green-700">{{ saveNotice }}</p>
      <p v-if="saveError" role="alert" class="mt-3 text-sm text-red-700">{{ saveError }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
  import type { AgendaEntry, Meeting, Proposal } from '~~/shared/types/bill';
  import { normalizeAgenda } from '~~/shared/utils/agenda';

  const props = defineProps<{ meetings: Meeting[] }>();
  const meetingId = ref(0);
  const selectedMeeting = computed(() =>
    props.meetings.find((meeting) => meeting.id === meetingId.value),
  );
  const proposals = ref<Proposal[]>([]);
  const entries = ref<AgendaEntry[]>([]);
  const entryKeys = ref<number[]>([]);
  let nextKey = 0;
  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref('');
  const saveError = ref('');
  const saveNotice = ref('');
  const dragIndex = ref(-1);
  let loadedMeetingId = 0;
  let savedSnapshot = '';
  let queuedSnapshot = '';
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let saveQueue: Promise<void> = Promise.resolve();
  const proposalMap = computed(() => new Map(proposals.value.map((item) => [item.id, item])));
  const newProposals = computed(() =>
    proposals.value.filter((item) => !entries.value.some((entry) => entry.proposalId === item.id)),
  );
  const hasElectionSection = computed(() =>
    entries.value.some((entry) => entry.kind === 'heading' && entry.content.includes('選舉事項')),
  );

  watch(meetingId, async (id, _oldId, onCleanup) => {
    clearTimeout(saveTimer);
    if (loadedMeetingId) void queueSave(loadedMeetingId);
    loadedMeetingId = 0;
    saving.value = false;
    entries.value = [];
    entryKeys.value = [];
    proposals.value = [];
    loadError.value = '';
    saveError.value = '';
    saveNotice.value = '';
    loading.value = Boolean(id);
    if (!id) return;
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    try {
      await saveQueue;
      if (cancelled) return;
      const [bills, agenda] = await Promise.all([
        $fetch<Proposal[]>(`/api/meetings/${id}/proposals`),
        $fetch<AgendaEntry[]>(`/api/meetings/${id}/agenda`),
      ]);
      if (cancelled) return;
      proposals.value = bills;
      entries.value = normalizeAgenda(selectedMeeting.value!, bills, agenda);
      entryKeys.value = entries.value.map(() => nextKey++);
      savedSnapshot = JSON.stringify(entries.value);
      queuedSnapshot = savedSnapshot;
      loadedMeetingId = id;
    } catch (error) {
      if (!cancelled) loadError.value = error instanceof Error ? error.message : '載入失敗';
    } finally {
      if (!cancelled) loading.value = false;
    }
  });

  watch(
    entries,
    () => {
      if (!loadedMeetingId || meetingId.value !== loadedMeetingId) return;
      clearTimeout(saveTimer);
      if (JSON.stringify(entries.value) === queuedSnapshot) return;
      saveNotice.value = '';
      saveError.value = '';
      saveTimer = setTimeout(() => void queueSave(), 800);
    },
    { deep: true },
  );

  onBeforeUnmount(() => {
    clearTimeout(saveTimer);
    if (loadedMeetingId) void queueSave(loadedMeetingId);
  });

  function insertEntry(index: number) {
    entries.value.splice(index, 0, { kind: 'text', content: '', proposalId: null });
    entryKeys.value.splice(index, 0, nextKey++);
  }
  function addElectionText() {
    const discussionIndex = entries.value.findIndex(
      (entry) => entry.kind === 'heading' && entry.content.includes('討論事項'),
    );
    if (discussionIndex < 0) return;
    entries.value.splice(
      discussionIndex,
      0,
      { kind: 'heading', content: '選舉事項', proposalId: null },
      { kind: 'text', content: '', proposalId: null },
    );
    entries.value = normalizeAgenda(selectedMeeting.value!, proposals.value, entries.value);
    entryKeys.value = entries.value.map(() => nextKey++);
  }
  function addProposal(proposalId: number) {
    const proposal = proposalMap.value.get(proposalId);
    if (!proposal || !selectedMeeting.value) return;
    const headingName = { report: '報告事項', election: '選舉事項', discussion: '討論事項' }[
      proposal.proposalType
    ];
    let headingIndex = entries.value.findIndex(
      (entry) => entry.kind === 'heading' && entry.content.includes(headingName),
    );
    if (headingIndex < 0 && proposal.proposalType === 'election') {
      headingIndex = entries.value.findIndex(
        (entry) => entry.kind === 'heading' && entry.content.includes('討論事項'),
      );
      entries.value.splice(headingIndex, 0, {
        kind: 'heading',
        content: '選舉事項',
        proposalId: null,
      });
    }
    const nextHeading = entries.value.findIndex(
      (entry, index) => index > headingIndex && entry.kind === 'heading',
    );
    entries.value.splice(nextHeading < 0 ? entries.value.length : nextHeading, 0, {
      kind: 'proposal',
      content: '',
      proposalId,
    });
    entries.value = normalizeAgenda(selectedMeeting.value, proposals.value, entries.value);
    entryKeys.value = entries.value.map(() => nextKey++);
  }
  function removeEntry(index: number) {
    if (entries.value[index]?.kind === 'heading') return;
    entries.value.splice(index, 1);
    entryKeys.value.splice(index, 1);
  }
  function startDrag(event: DragEvent, index: number) {
    dragIndex.value = index;
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  function moveEntry(from: number, to: number) {
    if (
      from < 0 ||
      to < 0 ||
      from >= entries.value.length ||
      to >= entries.value.length ||
      from === to ||
      entries.value[from]?.kind === 'heading'
    )
      return;
    entries.value.splice(to, 0, ...entries.value.splice(from, 1));
    entryKeys.value.splice(to, 0, ...entryKeys.value.splice(from, 1));
    dragIndex.value = -1;
  }
  function queueSave(id = loadedMeetingId): Promise<void> {
    const meeting = props.meetings.find((item) => item.id === id);
    if (!meeting || id !== loadedMeetingId) return saveQueue;
    clearTimeout(saveTimer);
    const draft = entries.value.map((entry) => ({ ...entry }));
    const draftSnapshot = JSON.stringify(draft);
    if (draftSnapshot === queuedSnapshot) return saveQueue;
    saveError.value = '';
    saveNotice.value = '';
    if (draft.some((entry) => entry.kind !== 'proposal' && !entry.content.trim())) {
      saveError.value = '請填寫或移除空白文字項目';
      return saveQueue;
    }
    const normalized = normalizeAgenda(meeting, proposals.value, draft);
    queuedSnapshot = draftSnapshot;
    saveQueue = saveQueue.then(async () => {
      if (meetingId.value === id) saving.value = true;
      try {
        await $fetch(`/api/meetings/${id}/agenda`, {
          method: 'PUT',
          body: { entries: normalized },
        });
        if (meetingId.value !== id || loadedMeetingId !== id) return;
        savedSnapshot = JSON.stringify(normalized);
        if (queuedSnapshot === draftSnapshot) queuedSnapshot = savedSnapshot;
        if (JSON.stringify(entries.value) !== draftSnapshot) return;
        if (savedSnapshot !== draftSnapshot) {
          entries.value = normalized;
          entryKeys.value = entries.value.map(() => nextKey++);
        }
        saveError.value = '';
        saveNotice.value = '議程已儲存';
      } catch (error) {
        if (meetingId.value === id && loadedMeetingId === id && queuedSnapshot === draftSnapshot) {
          queuedSnapshot = savedSnapshot;
          saveError.value = error instanceof Error ? error.message : '儲存失敗';
        }
      } finally {
        if (meetingId.value === id) saving.value = false;
      }
    });
    return saveQueue;
  }
</script>

<style scoped>
  .admin-section {
    border: 1px solid #dcdce2;
    border-radius: 8px;
    background: #fff;
    padding: 1.25rem;
    box-shadow: 0 10px 32px rgba(0, 0, 36, 0.05);
  }
  .control {
    width: 100%;
    border: 1px solid #dcdce2;
    border-radius: 8px;
    background: #fff;
    padding: 0.6rem 0.75rem;
    color: #12122b;
  }
  .control:focus {
    border-color: #e60012;
    outline: 3px solid rgba(230, 0, 18, 0.18);
  }
</style>
