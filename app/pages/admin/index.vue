<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <div
      class="mb-8 flex flex-col gap-4 border-b border-[#dcdce2] pb-5 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <p class="text-sm font-black text-[#e60012]">後台</p>
        <h1 class="mt-1 text-3xl font-black text-[#12122b]">資料管理</h1>
      </div>
      <NuxtLink to="/bill/new" class="btn btn-primary self-start md:self-auto">新增議案</NuxtLink>
    </div>

    <div
      v-if="notice"
      class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700"
    >
      {{ notice }}
    </div>

    <div
      v-if="errorMessage"
      class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
    >
      {{ errorMessage }}
    </div>

    <div class="admin-tabs" role="tablist" aria-label="後台子分頁">
      <button
        class="admin-tab"
        :class="{ active: activeAdminTab === 'meetings' }"
        type="button"
        role="tab"
        id="admin-tab-meetings"
        :tabindex="activeAdminTab === 'meetings' ? 0 : -1"
        :aria-selected="activeAdminTab === 'meetings'"
        @click="setActiveAdminTab('meetings')"
        @keydown="onTabKeydown"
      >
        會議控制台
      </button>
      <button
        class="admin-tab"
        :class="{ active: activeAdminTab === 'scheduling' }"
        type="button"
        role="tab"
        id="admin-tab-scheduling"
        :tabindex="activeAdminTab === 'scheduling' ? 0 : -1"
        :aria-selected="activeAdminTab === 'scheduling'"
        @click="setActiveAdminTab('scheduling')"
        @keydown="onTabKeydown"
      >
        議案排案
      </button>
      <button
        class="admin-tab"
        :class="{ active: activeAdminTab === 'agenda' }"
        type="button"
        role="tab"
        id="admin-tab-agenda"
        :tabindex="activeAdminTab === 'agenda' ? 0 : -1"
        :aria-selected="activeAdminTab === 'agenda'"
        @click="setActiveAdminTab('agenda')"
        @keydown="onTabKeydown"
      >
        設定議程
      </button>
      <button
        class="admin-tab"
        :class="{ active: activeAdminTab === 'minutes' }"
        type="button"
        role="tab"
        id="admin-tab-minutes"
        :tabindex="activeAdminTab === 'minutes' ? 0 : -1"
        :aria-selected="activeAdminTab === 'minutes'"
        @click="setActiveAdminTab('minutes')"
        @keydown="onTabKeydown"
      >
        製作會議記錄
      </button>
      <button
        class="admin-tab"
        :class="{ active: activeAdminTab === 'reference' }"
        type="button"
        role="tab"
        id="admin-tab-reference"
        :tabindex="activeAdminTab === 'reference' ? 0 : -1"
        :aria-selected="activeAdminTab === 'reference'"
        @click="setActiveAdminTab('reference')"
        @keydown="onTabKeydown"
      >
        基本資料
      </button>
    </div>

    <div
      v-if="activeAdminTab === 'reference'"
      role="tabpanel"
      aria-labelledby="admin-tab-reference"
      class="grid gap-6 xl:grid-cols-2"
    >
      <section class="admin-section">
        <div class="section-head">
          <h2 class="section-title">會期</h2>
        </div>

        <button class="btn btn-primary" type="button" :disabled="isSubmitting" @click="addSession">
          新增會期
        </button>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>代碼</th>
                <th>名稱</th>
                <th>期間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in sessions" :key="session.id">
                <td>{{ session.id }}</td>
                <td>{{ session.title }}</td>
                <td>{{ formatRange(session.startsAt, session.endsAt) }}</td>
                <td>
                  <button
                    v-if="isFutureSession(session)"
                    class="text-button danger"
                    type="button"
                    @click="deleteResource('sessions', session.id, '會期')"
                  >
                    刪除
                  </button>
                </td>
              </tr>
              <tr v-if="sessions.length === 0">
                <td colspan="4" class="empty-cell">尚無會期</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="admin-section">
        <div class="section-head">
          <h2 class="section-title">委員會</h2>
        </div>

        <form class="form-grid" @submit.prevent="submitCommittee">
          <label class="field">
            <span>名稱</span>
            <input v-model="committeeForm.name" required class="control" placeholder="程序委員會" />
          </label>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
              {{ editingCommitteeId === null ? '新增委員會' : '儲存委員會' }}
            </button>
            <button
              v-if="editingCommitteeId !== null"
              class="btn btn-secondary"
              type="button"
              @click="resetCommitteeForm"
            >
              取消
            </button>
          </div>
        </form>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>名稱</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="committee in committees" :key="committee.id">
                <td>{{ committee.name }}</td>
                <td>
                  <div class="row-actions">
                    <button class="text-button" type="button" @click="editCommittee(committee)">
                      編輯
                    </button>
                    <button
                      class="text-button danger"
                      type="button"
                      @click="deleteResource('committees', committee.id, '委員會')"
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="committees.length === 0">
                <td colspan="2" class="empty-cell">尚無委員會</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="admin-section">
        <div class="section-head">
          <h2 class="section-title">人員</h2>
        </div>

        <form class="form-grid" @submit.prevent="submitUser">
          <label class="field">
            <span>姓名</span>
            <input v-model="userForm.name" required class="control" />
          </label>
          <label class="field">
            <span>Email</span>
            <input v-model="userForm.email" required type="email" class="control" />
          </label>
          <label class="field">
            <span>權限角色</span>
            <select v-model="userForm.permissionRole" class="control">
              <option value="legislator">議員</option>
              <option value="secretariat_admin">秘書處</option>
            </select>
          </label>
          <label class="field md:col-span-2">
            <span>所屬委員會（可複選）</span>
            <div
              class="checkbox-list"
              :class="{ disabled: userForm.permissionRole === 'secretariat_admin' }"
            >
              <label v-for="committee in committees" :key="committee.id" class="checkbox-option">
                <input
                  v-model="userForm.committeeIds"
                  type="checkbox"
                  :value="String(committee.id)"
                  :disabled="userForm.permissionRole === 'secretariat_admin'"
                />
                {{ committee.name }}
              </label>
              <span v-if="committees.length === 0" class="checkbox-empty">尚無委員會</span>
            </div>
          </label>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
              {{ editingUserId === null ? '新增人員' : '儲存人員' }}
            </button>
            <button
              v-if="editingUserId !== null"
              class="btn btn-secondary"
              type="button"
              @click="resetUserForm"
            >
              取消
            </button>
          </div>
        </form>

        <form class="form-grid bulk-user-form" @submit.prevent="submitBulkUsers">
          <label class="field md:col-span-2">
            <span>批次名單</span>
            <textarea
              v-model="bulkUserForm.entries"
              v-auto-resize
              required
              rows="1"
              class="control auto-resize-textarea"
              placeholder="姓名<email>,姓名<email>"
            ></textarea>
          </label>
          <label class="field">
            <span>權限角色</span>
            <select v-model="bulkUserForm.permissionRole" class="control">
              <option value="legislator">議員</option>
              <option value="secretariat_admin">秘書處</option>
            </select>
          </label>
          <label class="field">
            <span>所屬委員會（可複選）</span>
            <div
              class="checkbox-list"
              :class="{ disabled: bulkUserForm.permissionRole === 'secretariat_admin' }"
            >
              <label v-for="committee in committees" :key="committee.id" class="checkbox-option">
                <input
                  v-model="bulkUserForm.committeeIds"
                  type="checkbox"
                  :value="String(committee.id)"
                  :disabled="bulkUserForm.permissionRole === 'secretariat_admin'"
                />
                {{ committee.name }}
              </label>
              <span v-if="committees.length === 0" class="checkbox-empty">尚無委員會</span>
            </div>
          </label>
          <div class="form-actions md:col-span-2">
            <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
              大量新增人員
            </button>
            <button class="btn btn-secondary" type="button" @click="resetBulkUserForm">清空</button>
          </div>
        </form>
      </section>

      <section class="admin-section">
        <div class="section-head">
          <h2 class="section-title">成員名單</h2>
        </div>
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>Email</th>
                <th>權限</th>
                <th>委員會</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.permissionRole === 'secretariat_admin' ? '秘書處' : '議員' }}</td>
                <td>{{ getCommitteeNames(user.committeeIds) }}</td>
                <td>
                  <div class="row-actions">
                    <button class="text-button" type="button" @click="editUser(user)">編輯</button>
                    <button
                      class="text-button danger"
                      type="button"
                      @click="deleteResource('users', user.id, '人員')"
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="users.length === 0">
                <td colspan="5" class="empty-cell">尚無人員</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div
      v-else-if="activeAdminTab === 'meetings'"
      role="tabpanel"
      aria-labelledby="admin-tab-meetings"
      class="w-full"
    >
      <section class="admin-section">
        <div class="section-head">
          <h2 class="section-title">會議控制台</h2>
        </div>

        <form class="form-grid" @submit.prevent="submitMeeting">
          <label class="field">
            <span>委員會</span>
            <select v-model="meetingForm.committeeId" class="control">
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
          <label class="field">
            <span>會期</span>
            <select v-model="meetingForm.session" required class="control">
              <option value="">請選擇</option>
              <option v-for="session in sessions" :key="session.id" :value="String(session.id)">
                {{ session.title }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>會議名稱</span>
            <input v-model="meetingForm.title" required class="control" />
          </label>
          <label class="field">
            <span>會議地點</span>
            <input v-model="meetingForm.location" class="control" />
          </label>
          <label class="field">
            <span>會議時間</span>
            <div class="datetime-fields">
              <input
                v-model="meetingForm.meetingDate"
                required
                type="date"
                aria-label="會議日期"
                class="control"
              />
              <input
                v-model="meetingForm.meetingTime"
                required
                type="text"
                maxlength="5"
                pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
                placeholder="HH:mm"
                title="請以 24 小時制輸入時間，例如 14:30"
                aria-label="會議時間（24 小時制）"
                class="control"
              />
            </div>
          </label>
          <label class="field">
            <span>提案截止</span>
            <div class="datetime-fields">
              <input
                v-model="meetingForm.proposalDeadlineDate"
                required
                type="date"
                :max="meetingForm.meetingDate || undefined"
                aria-label="提案截止日期"
                class="control"
              />
              <input
                v-model="meetingForm.proposalDeadlineTime"
                required
                type="text"
                maxlength="5"
                pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
                placeholder="HH:mm"
                title="請以 24 小時制輸入時間，例如 14:30"
                aria-label="提案截止時間（24 小時制）"
                class="control"
              />
            </div>
            <span v-if="deadlineAfterMeeting" class="text-sm text-red-700">
              提案截止時間不可晚於會議時間
            </span>
          </label>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
              {{ editingMeetingId === null ? '新增會議' : '儲存會議' }}
            </button>
            <button
              v-if="editingMeetingId !== null"
              class="btn btn-secondary"
              type="button"
              @click="resetMeetingForm"
            >
              取消
            </button>
          </div>
        </form>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>會議</th>
                <th>委員會</th>
                <th>會期</th>
                <th>日期</th>
                <th>地點</th>
                <th>截止</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="meeting in meetings" :key="meeting.id">
                <td>{{ meeting.title }}</td>
                <td>{{ meeting.meetingTypeName }}</td>
                <td>{{ formatSession(meeting.session) }}</td>
                <td>{{ formatDate(meeting.meetingDate) }}</td>
                <td>{{ meeting.location || '未設定' }}</td>
                <td>{{ formatDateTime(meeting.proposalDeadlineAt) }}</td>
                <td>
                  <div class="row-actions">
                    <button class="text-button" type="button" @click="editMeeting(meeting)">
                      編輯
                    </button>
                    <button
                      class="text-button danger"
                      type="button"
                      @click="deleteResource('meetings', meeting.id, '會議')"
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="meetings.length === 0">
                <td colspan="7" class="empty-cell">尚無會議</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
    <AgendaEditor
      v-else-if="activeAdminTab === 'agenda'"
      role="tabpanel"
      aria-labelledby="admin-tab-agenda"
      :meetings="meetings"
      class="w-full"
    />
    <MinutesEditor
      v-else-if="activeAdminTab === 'minutes'"
      ref="minutesEditor"
      role="tabpanel"
      aria-labelledby="admin-tab-minutes"
      :meetings="meetings"
      class="w-full"
    />
    <div v-else role="tabpanel" aria-labelledby="admin-tab-scheduling" class="w-full">
      <section class="admin-section">
        <div class="section-head">
          <h2 class="section-title">議案排入會議</h2>
        </div>
        <div v-if="sortedBills.length" class="schedule-list">
          <article v-for="bill in sortedBills" :key="bill.id" class="schedule-card">
            <div class="schedule-card-head">
              <div class="min-w-0">
                <h3 class="schedule-title">
                  <ProposalTypePill :proposal-type="bill.proposalType" class="shrink-0" />
                  <NuxtLink :to="`/bill/proposal/${bill.id}`" class="text-button schedule-link">
                    {{ bill.subject }}
                  </NuxtLink>
                </h3>
                <p class="schedule-meta">
                  {{ formatSession(bill.session) }}／{{ bill.committeeName }}
                </p>
              </div>
            </div>

            <div class="schedule-details">
              <dl class="schedule-people">
                <div>
                  <dt class="schedule-label">提案人</dt>
                  <dd class="schedule-person">{{ bill.proposerName }}</dd>
                </div>
                <div>
                  <dt class="schedule-label">連署人</dt>
                  <dd class="schedule-person">{{ confirmedCosponsorNames(bill) || '無' }}</dd>
                </div>
              </dl>

              <div>
                <h4 class="schedule-label">排入會議</h4>
                <div v-if="matchingMeetings(bill).length" class="schedule-options">
                  <label
                    v-for="meeting in matchingMeetings(bill)"
                    :key="meeting.id"
                    class="schedule-option"
                  >
                    <input
                      v-model="billMeetingSelection[bill.id]"
                      type="checkbox"
                      :value="meeting.id"
                    />
                    <span class="min-w-0">
                      <span class="schedule-option-title">{{ meeting.title }}</span>
                      <span class="schedule-option-date">{{
                        formatDateTime(meeting.meetingDate)
                      }}</span>
                    </span>
                  </label>
                </div>
                <p v-else class="schedule-empty">沒有可排入的會議</p>
              </div>
            </div>

            <div class="schedule-actions">
              <button
                class="btn btn-primary schedule-save"
                type="button"
                :disabled="isSubmitting || sameMeetingSelection(bill)"
                @click="scheduleBill(bill)"
              >
                儲存排案
              </button>
            </div>
          </article>
        </div>
        <p v-else class="schedule-empty py-6 text-center">尚無議案</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { vAutoResize } from '~/utils/autoResizeTextarea';
  import { computed, reactive, ref, watch } from 'vue';
  import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
  import type { Bill, Committee, Meeting, Session, User } from '~~/shared/types/bill';
  import { formatTermLabel } from '~~/shared/utils/term';

  definePageMeta({
    title: '後台資料管理',
    middleware: ['secretariat'],
  });

  type ResourceType = 'sessions' | 'committees' | 'users' | 'meetings';
  type AdminTab = 'reference' | 'meetings' | 'scheduling' | 'agenda' | 'minutes';
  const tabOrder: AdminTab[] = ['meetings', 'scheduling', 'agenda', 'minutes', 'reference'];

  const notice = ref('');
  const errorMessage = ref('');
  const isSubmitting = ref(false);
  const route = useRoute();
  const activeAdminTab = computed<AdminTab>(() =>
    tabOrder.includes(route.query.tab as AdminTab) ? (route.query.tab as AdminTab) : 'meetings',
  );
  const minutesEditor = ref<{ hasUnsavedChanges: () => boolean } | null>(null);

  function setActiveAdminTab(tab: AdminTab) {
    if (tab !== activeAdminTab.value) {
      void navigateTo({ path: '/admin', query: { ...route.query, tab } });
    }
  }

  function onTabKeydown(event: KeyboardEvent) {
    const current = (event.currentTarget as HTMLElement).id.replace('admin-tab-', '') as AdminTab;
    const index = tabOrder.indexOf(current);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabOrder.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabOrder.length) % tabOrder.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabOrder.length - 1;
    else return;
    event.preventDefault();
    const tab = tabOrder[next];
    if (!tab) return;
    const button = document.getElementById(`admin-tab-${tab}`);
    button?.focus();
    button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function confirmUnsavedMinutes() {
    return (
      !minutesEditor.value?.hasUnsavedChanges() ||
      window.confirm('會議記錄尚未儲存，確定要離開嗎？')
    );
  }

  onBeforeRouteUpdate((to, from) => {
    if (to.query.tab !== from.query.tab && !confirmUnsavedMinutes()) return false;
  });
  onBeforeRouteLeave(() => {
    if (!confirmUnsavedMinutes()) return false;
  });
  const editingCommitteeId = ref<number | null>(null);
  const editingUserId = ref<number | null>(null);
  const editingMeetingId = ref<number | null>(null);
  const billMeetingSelection = reactive<Record<number, number[]>>({});

  const committeeForm = reactive({ name: '' });

  const userForm = reactive({
    name: '',
    email: '',
    permissionRole: 'legislator',
    committeeIds: [] as string[],
  });

  const bulkUserForm = reactive({
    entries: '',
    permissionRole: 'legislator',
    committeeIds: [] as string[],
  });

  const meetingForm = reactive({
    committeeId: '',
    session: '',
    title: '',
    location: '',
    meetingDate: '',
    meetingTime: '',
    proposalDeadlineDate: '',
    proposalDeadlineTime: '',
  });
  const deadlineAfterMeeting = computed(() => {
    if (
      !meetingForm.meetingDate ||
      !meetingForm.meetingTime ||
      !meetingForm.proposalDeadlineDate ||
      !meetingForm.proposalDeadlineTime
    ) {
      return false;
    }
    const meetingTime = new Date(`${meetingForm.meetingDate}T${meetingForm.meetingTime}`).getTime();
    const deadlineTime = new Date(
      `${meetingForm.proposalDeadlineDate}T${meetingForm.proposalDeadlineTime}`,
    ).getTime();
    return (
      Number.isFinite(meetingTime) && Number.isFinite(deadlineTime) && deadlineTime > meetingTime
    );
  });

  const { data: sessionsData, refresh: refreshSessions } =
    await useFetch<Session[]>('/api/sessions');
  const { data: committeesData, refresh: refreshCommittees } =
    await useFetch<Committee[]>('/api/committees');
  const { data: usersData, refresh: refreshUsers } = await useFetch<User[]>('/api/users');
  const { data: meetingsData, refresh: refreshMeetings } =
    await useFetch<Meeting[]>('/api/meetings');
  const { data: billsData, refresh: refreshBills } = await useFetch<Bill[]>('/api/bills?type=all');

  const sessions = computed(() => sessionsData.value ?? []);
  const committees = computed(() => committeesData.value ?? []);
  const users = computed(() => usersData.value ?? []);
  const meetings = computed(() => meetingsData.value ?? []);
  const bills = computed(() => billsData.value ?? []);
  const sortedBills = computed(() =>
    [...bills.value].sort(
      (a, b) => Number(Boolean(a.meetings.length)) - Number(Boolean(b.meetings.length)),
    ),
  );

  watch(
    bills,
    (items) => {
      for (const bill of items)
        billMeetingSelection[bill.id] = bill.meetings.map((meeting) => meeting.id);
    },
    { immediate: true },
  );

  function matchingMeetings(bill: Bill) {
    return meetings.value.filter(
      (meeting) => meeting.session === bill.session && meeting.committeeId === bill.committeeId,
    );
  }

  function confirmedCosponsorNames(bill: Bill) {
    return bill.cosponsors
      .filter((cosponsor) => cosponsor.userName)
      .map((cosponsor) => cosponsor.userName)
      .join('、');
  }

  function sameMeetingSelection(bill: Bill) {
    const selected = billMeetingSelection[bill.id] ?? [];
    return (
      selected.length === bill.meetings.length &&
      selected.every((id) => bill.meetings.some((meeting) => meeting.id === id))
    );
  }

  async function scheduleBill(bill: Bill) {
    const meetingIds = billMeetingSelection[bill.id] ?? [];
    const result = await requestJson<Bill>(`/api/proposals/${bill.id}/meeting`, 'PUT', {
      meetingIds,
    });
    if (!result) return;

    notice.value = meetingIds.length ? '已更新排案' : '已取消議案排程';
    await refreshBills();
  }

  async function requestJson<T>(url: string, method: string, body?: unknown): Promise<T | null> {
    errorMessage.value = '';
    notice.value = '';
    isSubmitting.value = true;

    try {
      const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.statusMessage || '操作失敗');
      }

      return data as T;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '操作失敗';
      return null;
    } finally {
      isSubmitting.value = false;
    }
  }

  async function refreshAll() {
    await Promise.all([refreshSessions(), refreshCommittees(), refreshUsers(), refreshMeetings()]);
  }

  async function addSession() {
    const result = await requestJson<Session>('/api/sessions', 'POST', {});
    if (!result) return;

    notice.value = `已新增${result.title}`;
    await refreshAll();
  }

  async function submitCommittee() {
    const payload = { name: committeeForm.name.trim() };
    const url =
      editingCommitteeId.value === null
        ? '/api/committees'
        : `/api/committees/${editingCommitteeId.value}`;
    const method = editingCommitteeId.value === null ? 'POST' : 'PUT';
    const result = await requestJson<Committee>(url, method, payload);
    if (!result) return;

    resetCommitteeForm();
    notice.value = method === 'POST' ? '已新增委員會' : '已更新委員會';
    await refreshAll();
  }

  async function submitUser() {
    const payload = {
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      permissionRole: userForm.permissionRole,
      committeeIds:
        userForm.permissionRole === 'legislator' ? userForm.committeeIds.map(Number) : [],
    };
    const url = editingUserId.value === null ? '/api/users' : `/api/users/${editingUserId.value}`;
    const method = editingUserId.value === null ? 'POST' : 'PUT';
    const result = await requestJson<User>(url, method, payload);
    if (!result) return;

    resetUserForm();
    notice.value = method === 'POST' ? '已新增人員' : '已更新人員';
    await refreshAll();
  }

  async function submitBulkUsers() {
    const payload = {
      entries: bulkUserForm.entries.trim(),
      permissionRole: bulkUserForm.permissionRole,
      committeeIds:
        bulkUserForm.permissionRole === 'legislator' ? bulkUserForm.committeeIds.map(Number) : [],
    };
    const result = await requestJson<{ users: User[] }>('/api/users/bulk', 'POST', payload);
    if (!result) return;

    resetBulkUserForm();
    notice.value = `已新增 ${result.users.length} 位人員`;
    await refreshAll();
  }

  async function submitMeeting() {
    if (deadlineAfterMeeting.value) {
      errorMessage.value = '提案截止時間不可晚於會議時間';
      notice.value = '';
      return;
    }

    const payload = {
      committeeId: meetingForm.committeeId ? Number(meetingForm.committeeId) : null,
      session: Number(meetingForm.session),
      title: meetingForm.title.trim(),
      location: meetingForm.location.trim(),
      meetingDate: toIsoString(meetingForm.meetingDate, meetingForm.meetingTime),
      proposalDeadlineAt: toIsoString(
        meetingForm.proposalDeadlineDate,
        meetingForm.proposalDeadlineTime,
      ),
    };
    const url =
      editingMeetingId.value === null ? '/api/meetings' : `/api/meetings/${editingMeetingId.value}`;
    const method = editingMeetingId.value === null ? 'POST' : 'PUT';
    const result = await requestJson<Meeting>(url, method, payload);
    if (!result) return;

    resetMeetingForm();
    notice.value = method === 'POST' ? '已新增會議' : '已更新會議';
    await refreshAll();
  }

  function editCommittee(committee: Committee) {
    editingCommitteeId.value = committee.id;
    committeeForm.name = committee.name;
  }

  function editUser(user: User) {
    editingUserId.value = user.id;
    userForm.name = user.name;
    userForm.email = user.email;
    userForm.permissionRole = user.permissionRole;
    userForm.committeeIds = user.committeeIds.map(String);
  }

  function editMeeting(meeting: Meeting) {
    editingMeetingId.value = meeting.id;
    meetingForm.committeeId = meeting.committeeId ? String(meeting.committeeId) : '';
    meetingForm.session = String(meeting.session);
    meetingForm.title = meeting.title;
    meetingForm.location = meeting.location;
    const meetingDateTime = toDateTimeInput(meeting.meetingDate);
    const deadlineDateTime = toDateTimeInput(meeting.proposalDeadlineAt);
    meetingForm.meetingDate = meetingDateTime.slice(0, 10);
    meetingForm.meetingTime = meetingDateTime.slice(11, 16);
    meetingForm.proposalDeadlineDate = deadlineDateTime.slice(0, 10);
    meetingForm.proposalDeadlineTime = deadlineDateTime.slice(11, 16);
  }

  async function deleteResource(type: ResourceType, id: number, label: string) {
    if (typeof window !== 'undefined' && !window.confirm(`確定要刪除這筆${label}資料嗎？`)) {
      return;
    }

    const result = await requestJson<{ success: boolean }>(`/api/${type}/${id}`, 'DELETE');
    if (!result) return;

    clearEditingState(type, id);
    notice.value = `已刪除${label}`;
    await refreshAll();
  }

  function clearEditingState(type: ResourceType, id: number) {
    if (type === 'committees' && editingCommitteeId.value === id) resetCommitteeForm();
    if (type === 'users' && editingUserId.value === id) resetUserForm();
    if (type === 'meetings' && editingMeetingId.value === id) resetMeetingForm();
  }

  function resetCommitteeForm() {
    editingCommitteeId.value = null;
    committeeForm.name = '';
  }

  function resetUserForm() {
    editingUserId.value = null;
    userForm.name = '';
    userForm.email = '';
    userForm.permissionRole = 'legislator';
    userForm.committeeIds = [];
  }

  function resetBulkUserForm() {
    bulkUserForm.entries = '';
    bulkUserForm.permissionRole = 'legislator';
    bulkUserForm.committeeIds = [];
  }

  function resetMeetingForm() {
    editingMeetingId.value = null;
    meetingForm.committeeId = '';
    meetingForm.session = '';
    meetingForm.title = '';
    meetingForm.location = '';
    meetingForm.meetingDate = '';
    meetingForm.meetingTime = '';
    meetingForm.proposalDeadlineDate = '';
    meetingForm.proposalDeadlineTime = '';
  }

  watch(
    () => userForm.permissionRole,
    (permissionRole) => {
      if (permissionRole === 'secretariat_admin') {
        userForm.committeeIds = [];
      }
    },
  );

  watch(
    () => bulkUserForm.permissionRole,
    (permissionRole) => {
      if (permissionRole === 'secretariat_admin') {
        bulkUserForm.committeeIds = [];
      }
    },
  );

  function toIsoString(datePart: string, timePart: string) {
    if (!datePart || !timePart) return '';
    const value = `${datePart}T${timePart}`;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  function toDateTimeInput(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  function formatDate(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

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

  function formatRange(startsAt?: string | null, endsAt?: string | null) {
    const start = formatDate(startsAt);
    const end = formatDate(endsAt);
    if (start && end) return `${start} 至 ${end}`;
    return start || end || '未設定';
  }

  function isFutureSession(session: Session) {
    if (!session.startsAt) return false;
    return session.startsAt.slice(0, 10) > getTaipeiDateString();
  }

  function getTaipeiDateString() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function formatSession(session: number) {
    return sessions.value.find((item) => item.id === session)?.title ?? formatTermLabel(session);
  }

  function getCommitteeName(id: number | null) {
    if (!id) return '無（大會）';
    return committees.value.find((committee) => committee.id === id)?.name ?? '未設定';
  }

  function getCommitteeNames(ids: number[]) {
    if (!ids.length) return '無';
    return ids.map(getCommitteeName).join('、');
  }
</script>

<style scoped>
  .admin-tabs {
    display: flex;
    gap: 0.35rem;
    margin-bottom: 1.25rem;
    border: 1px solid #dcdce2;
    border-radius: 8px;
    background: #f5f5f7;
    padding: 0.25rem;
    overflow-x: auto;
  }

  .admin-tab {
    position: relative;
    flex: none;
    border-radius: 6px;
    padding: 0.55rem 0.9rem;
    color: #5a5a70;
    font-size: 0.9rem;
    font-weight: 900;
    transition:
      background-color 0.16s ease,
      color 0.16s ease,
      box-shadow 0.16s ease;
  }

  .admin-tab.active {
    background: #fff;
    color: #12122b;
    box-shadow: 0 6px 18px rgba(0, 0, 36, 0.08);
  }

  .admin-tab.active::after {
    content: '';
    position: absolute;
    inset: auto 0 0;
    border-bottom: 3px solid currentColor;
  }

  .admin-tab:focus-visible {
    outline: 2px solid #e60012;
    outline-offset: -2px;
  }

  @media (min-width: 768px) {
    .admin-tabs {
      justify-content: flex-start;
    }

    .admin-tab {
      min-width: 8rem;
    }
  }

  .admin-section {
    border: 1px solid #dcdce2;
    border-radius: 8px;
    background: #fff;
    padding: 1.25rem;
    box-shadow: 0 10px 32px rgba(0, 0, 36, 0.05);
  }

  .schedule-list {
    display: grid;
    gap: 0.875rem;
  }

  .schedule-card {
    min-width: 0;
    border: 1px solid #dcdce2;
    border-radius: 8px;
    padding: 1rem;
  }

  .schedule-card-head,
  .schedule-title {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
  }

  .schedule-title {
    flex-wrap: wrap;
    align-items: center;
  }

  .schedule-link {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: 1rem;
    line-height: 1.5;
  }

  .schedule-meta,
  .schedule-empty,
  .schedule-option-date {
    color: #5a5a70;
    font-size: 0.875rem;
  }

  .schedule-meta {
    margin-top: 0.4rem;
  }

  .schedule-details {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
  }

  .schedule-label {
    margin-bottom: 0.5rem;
    color: #5a5a70;
    font-size: 0.75rem;
    font-weight: 900;
  }

  .schedule-people {
    display: grid;
    gap: 0.875rem;
  }

  .schedule-person {
    overflow-wrap: anywhere;
    font-size: 0.875rem;
    font-weight: 700;
  }

  .schedule-options {
    display: grid;
    gap: 0.5rem;
  }

  .schedule-option {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: 0.65rem;
    border: 1px solid #dcdce2;
    border-radius: 8px;
    padding: 0.65rem;
    cursor: pointer;
  }

  .schedule-option:has(input:checked) {
    border-color: #000024;
    background: #f5f5f7;
  }

  .schedule-option:focus-within {
    outline: 2px solid #000024;
    outline-offset: 2px;
  }

  .schedule-option input {
    flex: none;
    width: 1.1rem;
    height: 1.1rem;
    margin-top: 0.15rem;
    accent-color: #000024;
  }

  .schedule-option-title,
  .schedule-option-date {
    display: block;
    overflow-wrap: anywhere;
  }

  .schedule-option-title {
    color: #12122b;
    font-size: 0.875rem;
    font-weight: 750;
  }

  .schedule-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  .schedule-save {
    width: 100%;
  }

  .schedule-save:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (min-width: 640px) {
    .schedule-save {
      width: auto;
    }
  }

  @media (min-width: 768px) {
    .schedule-details {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
      gap: 1.5rem;
    }
  }

  @media (min-width: 1024px) {
    .schedule-options {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #dcdce2;
    padding-bottom: 0.75rem;
  }

  .section-title {
    color: #12122b;
    font-size: 1.25rem;
    font-weight: 900;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .form-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: #12122b;
    font-size: 0.875rem;
    font-weight: 800;
  }

  .datetime-fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 6.5rem;
    gap: 0.5rem;
  }

  .datetime-fields .control {
    min-width: 0;
  }

  .control {
    width: 100%;
    border: 1px solid #dcdce2;
    border-radius: 8px;
    background: #fff;
    padding: 0.6rem 0.75rem;
    color: #12122b;
    font-size: 0.925rem;
    font-weight: 650;
  }

  .control:disabled {
    background: #f5f5f7;
    color: #5a5a70;
  }

  .control:focus {
    border-color: #e60012;
    outline: 3px solid rgba(230, 0, 18, 0.18);
  }

  .checkbox-list {
    display: grid;
    max-height: 12rem;
    gap: 0.45rem;
    overflow-y: auto;
    border: 1px solid #dcdce2;
    border-radius: 8px;
    background: #fff;
    padding: 0.65rem 0.75rem;
  }

  .checkbox-list.disabled {
    background: #f5f5f7;
    color: #5a5a70;
  }

  .checkbox-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #12122b;
    font-size: 0.9rem;
    font-weight: 750;
  }

  .checkbox-option input {
    width: 1rem;
    height: 1rem;
    accent-color: #e60012;
  }

  .checkbox-option:has(input:disabled) {
    color: #8a8a9a;
  }

  .checkbox-empty {
    color: #5a5a70;
    font-size: 0.875rem;
    font-weight: 750;
  }

  .form-actions {
    display: flex;
    align-self: end;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .bulk-user-form {
    margin-top: 1.25rem;
    border-top: 1px solid #ececf0;
    padding-top: 1.25rem;
  }

  .table-wrap {
    margin-top: 1.25rem;
    overflow-x: auto;
  }

  .admin-table {
    width: 100%;
    min-width: 620px;
    border-collapse: collapse;
  }

  .admin-table th {
    border-bottom: 1px solid #dcdce2;
    background: #f5f5f7;
    padding: 0.7rem 0.75rem;
    text-align: left;
    color: #12122b;
    font-size: 0.75rem;
    font-weight: 900;
  }

  .admin-table td {
    border-bottom: 1px solid #ececf0;
    padding: 0.75rem;
    color: #12122b;
    font-size: 0.875rem;
    font-weight: 650;
    vertical-align: top;
  }

  .row-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .text-button {
    color: #000024;
    font-size: 0.875rem;
    font-weight: 900;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .text-button.danger {
    color: #e60012;
  }

  .empty-cell {
    color: #5a5a70 !important;
    text-align: center;
  }
</style>
