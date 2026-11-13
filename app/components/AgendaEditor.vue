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
        <option v-for="meeting in meetingsInReverseOrder" :key="meeting.id" :value="meeting.id">
          {{ meeting.title }}（{{ meeting.meetingTypeName }}）
        </option>
      </select>
    </label>
    <p v-if="loading" class="py-6 text-gray-600">載入議程中...</p>
    <p v-else-if="loadError" class="py-4 text-red-700">{{ loadError }}</p>
    <template v-else-if="selectedMeeting">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-gray-600">
          已排入的議案會自動列入對應段落；議案僅能在同一段落排序。
        </p>
        <button
          type="button"
          class="rounded border px-3 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="
            showInsertActions
              ? 'border-[#12122b] bg-[#12122b] text-white'
              : 'border-gray-400 text-[#12122b]'
          "
          :aria-pressed="showInsertActions"
          @click="showInsertActions = !showInsertActions"
        >
          插入文字項目
        </button>
      </div>
      <button
        v-if="showInsertActions && !hasElectionSection"
        type="button"
        class="mb-4 rounded border border-gray-400 px-3 py-1.5 text-sm font-semibold"
        @click="addElectionText"
      >
        ＋插入選舉事項文字
      </button>
      <ol
        ref="listRef"
        class="agenda-list"
        :class="{
          'space-y-3': !showInsertActions,
          'drop-at-end': dropSlot === entries.length && dragIndex >= 0,
        }"
        aria-label="議程排序"
      >
        <li
          v-for="(entry, index) in entries"
          :key="entryKeys[index]"
          :data-entry-key="entryKeys[index]"
          class="agenda-entry"
          :class="{ 'is-dragging': dragIndex === index, 'drop-before': dropSlot === index }"
          :style="dragIndex === index ? { transform: `translateY(${dragOffsetY}px)` } : undefined"
        >
          <div
            class="agenda-card flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
          >
            <span
              v-if="entry.kind !== 'heading'"
              class="drag-handle pt-2 text-gray-500"
              aria-hidden="true"
              @pointerdown="startDrag($event, index)"
              @pointermove="dragMove"
              @pointerup="endDrag"
              @pointercancel="cancelDrag"
              @lostpointercapture="cancelDrag"
            >
              ☰
            </span>
            <div class="min-w-0 flex-1">
              <label
                v-if="entry.kind === 'text'"
                class="mb-1 block text-xs font-semibold text-gray-500"
                :for="`agenda-text-${entryKeys[index]}`"
                >文字項目<span class="sr-only">，第 {{ index + 1 }} 項內容</span></label
              >
              <span
                v-else-if="entry.kind === 'proposal'"
                class="mb-1 block text-xs font-semibold text-gray-500"
                >議案</span
              >
              <p v-if="entry.kind === 'heading'" class="py-1 font-bold">{{ entry.content }}</p>
              <p v-else-if="entry.kind === 'proposal'" class="py-1 font-medium">
                {{ proposalMap.get(entry.proposalId ?? -1)?.subject || '議案已移出會議' }}
              </p>
              <textarea
                v-else
                :id="`agenda-text-${entryKeys[index]}`"
                v-model="entry.content"
                v-auto-resize
                rows="1"
                class="control auto-resize-textarea"
              />
            </div>
            <div v-if="entry.kind !== 'heading'" class="flex flex-col gap-1 text-sm">
              <button
                type="button"
                :disabled="!canMoveEntry(index, index - 1)"
                aria-label="上移"
                @click="moveEntry(index, index - 1)"
              >
                ↑
              </button>
              <button
                type="button"
                :disabled="!canMoveEntry(index, index + 1)"
                aria-label="下移"
                @click="moveEntry(index, index + 1)"
              >
                ↓
              </button>
              <button
                v-if="entry.kind === 'text'"
                type="button"
                class="text-red-700"
                aria-label="移除文字項目"
                @click="removeEntry(index)"
              >
                ×
              </button>
            </div>
          </div>
          <div v-if="showInsertActions" class="flex justify-center py-3">
            <button
              type="button"
              class="rounded border border-dashed border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-primary hover:border-primary hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="insertEntry(index + 1)"
            >
              ＋在此處插入文字<span class="sr-only">，第 {{ index + 1 }} 項後</span>
            </button>
          </div>
        </li>
      </ol>
      <p class="sr-only" role="status">{{ reorderNotice }}</p>
      <div class="mt-6 flex items-center gap-3">
        <NuxtLink
          :to="`/bill/${selectedMeeting.session}/meetings/${selectedMeeting.id}`"
          class="text-primary hover:underline"
          >查看會議頁</NuxtLink
        >
        <span v-if="saving" class="text-sm text-gray-600">儲存中...</span>
      </div>
      <p v-if="saveNotice" role="status" class="mt-3 text-sm text-green-700">{{ saveNotice }}</p>
      <p v-if="saveError" role="alert" class="mt-3 text-sm text-red-700">{{ saveError }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
  import type { AgendaEntry, Meeting, Proposal } from '~~/shared/types/bill';
  import { normalizeAgenda } from '~~/shared/utils/agenda';
  import { vAutoResize } from '~/utils/autoResizeTextarea';

  const props = defineProps<{ meetings: Meeting[] }>();
  const meetingId = ref(0);
  const meetingsInReverseOrder = computed(() => [...props.meetings].reverse());
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
  const showInsertActions = ref(false);
  const dragIndex = ref(-1);
  const dragOffsetY = ref(0);
  const dropSlot = ref(-1);
  const reorderNotice = ref('');
  const listRef = ref<HTMLOListElement | null>(null);
  let dragPointerId: number | null = null;
  let dragHandle: HTMLElement | null = null;
  let dragStartY = 0;
  let dragCurrentY = 0;
  let dragStartScrollY = 0;
  let dragFrame = 0;
  let lastDragFrame = 0;
  let loadedMeetingId = 0;
  let savedSnapshot = '';
  let queuedSnapshot = '';
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let saveQueue: Promise<void> = Promise.resolve();
  const proposalMap = computed(() => new Map(proposals.value.map((item) => [item.id, item])));
  const hasElectionSection = computed(() =>
    entries.value.some((entry) => entry.kind === 'heading' && entry.content.includes('選舉事項')),
  );

  watch(meetingId, async (id, _oldId, onCleanup) => {
    showInsertActions.value = false;
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
    cancelDrag();
    clearTimeout(saveTimer);
    if (loadedMeetingId) void queueSave(loadedMeetingId);
  });

  function insertEntry(index: number) {
    const key = nextKey++;
    entries.value.splice(index, 0, {
      kind: 'text',
      content: '',
      proposalId: null,
      decisionKey: crypto.randomUUID(),
    });
    entryKeys.value.splice(index, 0, key);
    focusInsertedText(key);
  }
  function addElectionText() {
    const discussionIndex = entries.value.findIndex(
      (entry) => entry.kind === 'heading' && entry.content.includes('討論事項'),
    );
    if (discussionIndex < 0) return;
    const decisionKey = crypto.randomUUID();
    entries.value.splice(
      discussionIndex,
      0,
      { kind: 'heading', content: '選舉事項', proposalId: null },
      { kind: 'text', content: '', proposalId: null, decisionKey },
    );
    entries.value = normalizeAgenda(selectedMeeting.value!, proposals.value, entries.value);
    entryKeys.value = entries.value.map(() => nextKey++);
    const textIndex = entries.value.findIndex((entry) => entry.decisionKey === decisionKey);
    const key = entryKeys.value[textIndex];
    if (key !== undefined) focusInsertedText(key);
  }
  function focusInsertedText(key: number) {
    showInsertActions.value = false;
    void nextTick(() => {
      listRef.value
        ?.querySelector<HTMLTextAreaElement>(`[data-entry-key="${key}"] textarea`)
        ?.focus();
    });
  }
  function removeEntry(index: number) {
    if (entries.value[index]?.kind !== 'text') return;
    entries.value.splice(index, 1);
    entryKeys.value.splice(index, 1);
  }
  function canDropAt(from: number, slot: number) {
    if (slot < 0 || slot > entries.value.length || !entries.value[from]) return false;
    if (entries.value[from]?.kind !== 'proposal') return true;
    let sectionStart = from - 1;
    while (sectionStart >= 0 && entries.value[sectionStart]?.kind !== 'heading') sectionStart--;
    let sectionEnd = from + 1;
    while (sectionEnd < entries.value.length && entries.value[sectionEnd]?.kind !== 'heading')
      sectionEnd++;
    return slot > sectionStart && slot <= sectionEnd;
  }
  function canMoveEntry(from: number, to: number) {
    return (
      from >= 0 &&
      to >= 0 &&
      from < entries.value.length &&
      to < entries.value.length &&
      from !== to &&
      entries.value[from]?.kind !== 'heading' &&
      canDropAt(from, to > from ? to + 1 : to)
    );
  }
  function startDrag(event: PointerEvent, index: number) {
    if (event.button !== 0 || !event.isPrimary || dragPointerId !== null) return;
    const handle = event.currentTarget;
    if (!(handle instanceof HTMLElement)) return;
    event.preventDefault();
    dragPointerId = event.pointerId;
    dragHandle = handle;
    dragIndex.value = index;
    dragStartY = dragCurrentY = event.clientY;
    dragStartScrollY = window.scrollY;
    dragOffsetY.value = 0;
    for (const row of Array.from(listRef.value?.children ?? [])) {
      row.getAnimations().forEach((animation) => animation.finish());
    }
    handle.setPointerCapture(event.pointerId);
    lastDragFrame = 0;
    dragFrame = requestAnimationFrame(scrollWhileDragging);
  }
  function dragMove(event: PointerEvent) {
    if (event.pointerId !== dragPointerId) return;
    dragCurrentY = event.clientY;
    updateDragPosition();
  }
  function updateDragPosition() {
    dragOffsetY.value = dragCurrentY - dragStartY + window.scrollY - dragStartScrollY;
    const rows = Array.from(listRef.value?.children ?? []);
    let slot = rows.length;
    for (let index = 0; index < rows.length; index++) {
      if (index === dragIndex.value) continue;
      const rect = rows[index]!.getBoundingClientRect();
      if (dragCurrentY < rect.top + rect.height / 2) {
        slot = index;
        break;
      }
    }
    dropSlot.value =
      slot === dragIndex.value || slot === dragIndex.value + 1 || !canDropAt(dragIndex.value, slot)
        ? -1
        : slot;
  }
  function scrollWhileDragging(time: number) {
    if (dragPointerId === null) return;
    const elapsed = lastDragFrame ? Math.min(time - lastDragFrame, 32) : 0;
    lastDragFrame = time;
    const edge = 80;
    let speed = 0;
    if (dragCurrentY < edge) speed = -Math.min(0.6, (edge - dragCurrentY) / 150);
    if (dragCurrentY > window.innerHeight - edge)
      speed = Math.min(0.6, (dragCurrentY - window.innerHeight + edge) / 150);
    if (speed && elapsed) {
      window.scrollBy(0, speed * elapsed);
      updateDragPosition();
    }
    dragFrame = requestAnimationFrame(scrollWhileDragging);
  }
  function endDrag(event: PointerEvent) {
    if (event.pointerId !== dragPointerId) return;
    const from = dragIndex.value;
    const slot = dropSlot.value;
    cancelDrag();
    if (slot < 0) return;
    moveEntry(from, slot > from ? slot - 1 : slot);
  }
  function cancelDrag() {
    const pointerId = dragPointerId;
    dragPointerId = null;
    if (dragFrame) cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    if (pointerId !== null && dragHandle?.hasPointerCapture(pointerId)) {
      dragHandle.releasePointerCapture(pointerId);
    }
    dragHandle = null;
    dragIndex.value = -1;
    dragOffsetY.value = 0;
    dropSlot.value = -1;
  }
  function moveEntry(from: number, to: number) {
    if (!canMoveEntry(from, to)) return;
    const previousPositions = new Map(
      Array.from(listRef.value?.children ?? []).map((row) => [
        (row as HTMLElement).dataset.entryKey,
        row.getBoundingClientRect().top,
      ]),
    );
    entries.value.splice(to, 0, ...entries.value.splice(from, 1));
    entryKeys.value.splice(to, 0, ...entryKeys.value.splice(from, 1));
    dragIndex.value = -1;
    reorderNotice.value = `已移至第 ${to + 1} 項`;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void nextTick(() => {
        for (const row of Array.from(listRef.value?.children ?? [])) {
          const previousTop = previousPositions.get((row as HTMLElement).dataset.entryKey);
          if (previousTop === undefined) continue;
          const offset = previousTop - row.getBoundingClientRect().top;
          if (Math.abs(offset) < 1) continue;
          row.animate([{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0)' }], {
            duration: 180,
            easing: 'ease-out',
          });
        }
      });
    }
  }
  function queueSave(id = loadedMeetingId): Promise<void> {
    const meeting = props.meetings.find((item) => item.id === id);
    if (!meeting || id !== loadedMeetingId) return saveQueue;
    clearTimeout(saveTimer);
    if (dragPointerId !== null) {
      saveTimer = setTimeout(() => void queueSave(id), 800);
      return saveQueue;
    }
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
  .agenda-list {
    position: relative;
  }
  .agenda-entry {
    position: relative;
  }
  .agenda-entry.is-dragging {
    z-index: 1;
  }
  .agenda-entry.is-dragging .agenda-card {
    box-shadow: 0 14px 28px rgba(0, 0, 36, 0.18);
  }
  .agenda-entry.drop-before::before,
  .agenda-list.drop-at-end::after {
    content: '';
    position: absolute;
    z-index: 3;
    right: 0;
    left: 0;
    height: 3px;
    border-radius: 3px;
    background: #e60012;
    pointer-events: none;
  }
  .agenda-entry.drop-before::before {
    top: -8px;
  }
  .agenda-list.drop-at-end::after {
    bottom: -8px;
  }
  .drag-handle {
    display: inline-flex;
    flex: none;
    justify-content: center;
    cursor: grab;
    min-width: 28px;
    min-height: 32px;
    border-radius: 4px;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }
  .is-dragging .drag-handle {
    cursor: grabbing;
  }
  @media (forced-colors: active) {
    .agenda-entry.drop-before::before,
    .agenda-list.drop-at-end::after {
      background: Highlight;
    }
  }
</style>
