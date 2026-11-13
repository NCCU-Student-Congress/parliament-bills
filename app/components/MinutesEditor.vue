<template>
  <section class="rounded-lg border border-[#dcdce2] bg-white p-5 shadow-sm">
    <h2 class="text-xl font-bold text-[#12122b]">製作會議記錄</h2>
    <p class="mt-1 text-sm text-gray-600">選擇會議後填寫每案決議，儲存後即可下載 PDF。</p>

    <label class="mt-5 block font-semibold" for="minutes-meeting">
      會議
      <select
        id="minutes-meeting"
        class="control mt-2"
        :value="meetingId"
        :disabled="loading || saving || downloading"
        @change="selectMeeting"
      >
        <option value="0">請選擇會議</option>
        <option v-for="meeting in [...meetings].reverse()" :key="meeting.id" :value="meeting.id">
          {{ meeting.title }}（{{ meeting.meetingTypeName }}）
        </option>
      </select>
    </label>

    <p v-if="loading" class="mt-5 text-gray-600">載入會議記錄中...</p>
    <p v-else-if="loadError" role="alert" class="mt-5 text-red-700">{{ loadError }}</p>
    <form v-else-if="selectedMeeting" class="mt-6" @submit.prevent="saveDecisions">
      <p class="mb-5 text-sm text-gray-600">
        {{ formatDateTime(selectedMeeting.meetingDate) }}／{{
          selectedMeeting.location || '未設定地點'
        }}
      </p>
      <div v-if="orderedProposals.length" class="space-y-4">
        <article
          v-for="item in orderedProposals"
          :key="item.proposal.id"
          class="rounded-lg border border-gray-200 p-4"
        >
          <h3 class="font-semibold text-[#12122b]">{{ item.title }}</h3>
          <label class="mt-3 block" :for="`decision-${item.proposal.id}`">
            <span class="mb-1 block text-sm font-semibold">決議</span>
            <textarea
              :id="`decision-${item.proposal.id}`"
              v-model="decisionDrafts[item.proposal.id]"
              class="control min-h-28"
              rows="4"
              maxlength="10000"
              aria-describedby="minutes-hint"
              placeholder="請輸入此案決議；可暫時留白"
            ></textarea>
          </label>
        </article>
      </div>
      <p v-else class="rounded-lg bg-gray-50 p-5 text-gray-600">本場會議尚無已排入議案。</p>
      <p id="minutes-hint" class="mt-3 text-sm text-gray-600">
        未填寫的決議在 PDF 中會顯示「尚未填寫」。
      </p>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <button class="btn btn-primary" type="submit" :disabled="saving || downloading || !dirty">
          {{ saving ? '儲存中...' : '儲存決議' }}
        </button>
        <button
          class="btn btn-secondary"
          type="button"
          :disabled="loading || saving || downloading || dirty"
          @click="downloadPdf"
        >
          {{ downloading ? '製作 PDF 中...' : '下載 PDF' }}
        </button>
        <span v-if="dirty" class="text-sm text-amber-800">有未儲存的修改</span>
      </div>
      <p v-if="saveNotice" role="status" class="mt-3 text-sm text-green-700">
        {{ saveNotice }}
      </p>
      <p v-if="actionError" role="alert" class="mt-3 text-sm text-red-700">
        {{ actionError }}
      </p>
    </form>
  </section>
</template>

<script setup lang="ts">
  import type { AgendaEntry, Meeting, MeetingDecision, Proposal } from '~~/shared/types/bill';
  import { agendaLines, normalizeAgenda } from '~~/shared/utils/agenda';

  const props = defineProps<{ meetings: Meeting[] }>();
  const meetingId = ref(0);
  const selectedMeeting = computed(() =>
    props.meetings.find((item) => item.id === meetingId.value),
  );
  const proposals = ref<Proposal[]>([]);
  const entries = ref<AgendaEntry[]>([]);
  const decisionDrafts = ref<Record<number, string>>({});
  const savedSnapshot = ref('');
  const loading = ref(false);
  const saving = ref(false);
  const downloading = ref(false);
  const loadError = ref('');
  const actionError = ref('');
  const saveNotice = ref('');

  const orderedProposals = computed(() => {
    const proposalMap = new Map(proposals.value.map((item) => [item.id, item]));
    return agendaLines(entries.value, proposals.value).flatMap((line) => {
      if (line.entry.kind !== 'proposal') return [];
      const proposal = proposalMap.get(line.entry.proposalId ?? -1);
      return proposal ? [{ proposal, title: line.text }] : [];
    });
  });
  const decisionPayload = computed<MeetingDecision[]>(() =>
    proposals.value.map((proposal) => ({
      proposalId: proposal.id,
      decision: (decisionDrafts.value[proposal.id] ?? '').trim(),
    })),
  );
  const dirty = computed(() =>
    Boolean(
      selectedMeeting.value &&
      !loading.value &&
      JSON.stringify(decisionPayload.value) !== savedSnapshot.value,
    ),
  );

  function warnBeforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value) return;
    event.preventDefault();
  }

  onMounted(() => window.addEventListener('beforeunload', warnBeforeUnload));
  onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload));

  function selectMeeting(event: Event) {
    const select = event.target as HTMLSelectElement;
    const nextId = Number(select.value);
    if (dirty.value && !window.confirm('決議尚未儲存，確定要切換會議嗎？')) {
      select.value = String(meetingId.value);
      return;
    }
    meetingId.value = nextId;
  }

  watch(meetingId, async (id, _oldId, onCleanup) => {
    proposals.value = [];
    entries.value = [];
    decisionDrafts.value = {};
    savedSnapshot.value = '';
    loadError.value = '';
    actionError.value = '';
    saveNotice.value = '';
    loading.value = Boolean(id);
    if (!id || !selectedMeeting.value) return;
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    try {
      const [meetingProposals, agenda, decisions] = await Promise.all([
        $fetch<Proposal[]>(`/api/meetings/${id}/proposals`),
        $fetch<AgendaEntry[]>(`/api/meetings/${id}/agenda`),
        $fetch<MeetingDecision[]>(`/api/meetings/${id}/minutes`),
      ]);
      if (cancelled) return;
      proposals.value = meetingProposals;
      entries.value = normalizeAgenda(selectedMeeting.value, meetingProposals, agenda);
      const saved = new Map(decisions.map((item) => [item.proposalId, item.decision]));
      decisionDrafts.value = Object.fromEntries(
        meetingProposals.map((proposal) => [proposal.id, saved.get(proposal.id) ?? '']),
      );
      savedSnapshot.value = JSON.stringify(decisionPayload.value);
    } catch (error) {
      if (!cancelled) loadError.value = error instanceof Error ? error.message : '載入失敗';
    } finally {
      if (!cancelled) loading.value = false;
    }
  });

  async function saveDecisions() {
    if (!selectedMeeting.value || !dirty.value || saving.value) return;
    actionError.value = '';
    saveNotice.value = '';
    saving.value = true;
    const id = meetingId.value;
    const decisions = decisionPayload.value;
    try {
      const saved = await $fetch<MeetingDecision[]>(`/api/meetings/${id}/minutes`, {
        method: 'PUT',
        body: { decisions },
      });
      if (meetingId.value !== id) return;
      savedSnapshot.value = JSON.stringify(saved);
      saveNotice.value = '決議已儲存';
    } catch (error) {
      if (meetingId.value === id) {
        actionError.value = error instanceof Error ? error.message : '儲存失敗';
      }
    } finally {
      saving.value = false;
    }
  }

  async function downloadPdf() {
    if (!selectedMeeting.value || dirty.value || downloading.value) return;
    actionError.value = '';
    downloading.value = true;
    try {
      const id = meetingId.value;
      const [latestProposals, latestAgenda, latestDecisions] = await Promise.all([
        $fetch<Proposal[]>(`/api/meetings/${id}/proposals`),
        $fetch<AgendaEntry[]>(`/api/meetings/${id}/agenda`),
        $fetch<MeetingDecision[]>(`/api/meetings/${id}/minutes`),
      ]);
      const { createMeetingMinutesPdf } = await import('~/utils/meetingMinutesPdf');
      const bytes = await createMeetingMinutesPdf(
        selectedMeeting.value,
        normalizeAgenda(selectedMeeting.value, latestProposals, latestAgenda),
        latestProposals,
        latestDecisions,
      );
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedMeeting.value.title.replace(/[\\/:*?"<>|]/g, '_')}-會議記錄.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      actionError.value = error instanceof Error ? error.message : '下載失敗';
    } finally {
      downloading.value = false;
    }
  }

  function formatDateTime(value: string) {
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

  defineExpose({ hasUnsavedChanges: () => dirty.value });
</script>

<style scoped>
  .control {
    width: 100%;
    border: 1px solid #a9a9b3;
    border-radius: 8px;
    background: #fff;
    padding: 0.65rem 0.75rem;
    font: inherit;
    font-size: max(1rem, 1em);
  }
  .control:focus-visible {
    outline: 3px solid #e60012;
    outline-offset: 2px;
  }
</style>
