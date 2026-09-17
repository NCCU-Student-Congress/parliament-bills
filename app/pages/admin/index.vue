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
        :class="{ active: activeAdminTab === 'reference' }"
        type="button"
        role="tab"
        :aria-selected="activeAdminTab === 'reference'"
        @click="activeAdminTab = 'reference'"
      >
        基本資料
      </button>
      <button
        class="admin-tab"
        :class="{ active: activeAdminTab === 'meetings' }"
        type="button"
        role="tab"
        :aria-selected="activeAdminTab === 'meetings'"
        @click="activeAdminTab = 'meetings'"
      >
        會議控制台
      </button>
    </div>

    <div v-if="activeAdminTab === 'reference'" class="grid gap-6 xl:grid-cols-2">
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
          <label class="field">
            <span>代碼</span>
            <input v-model="committeeForm.code" class="control" placeholder="procedure" />
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
                <th>代碼</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="committee in committees" :key="committee.id">
                <td>{{ committee.name }}</td>
                <td>{{ committee.code || '無' }}</td>
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
                <td colspan="3" class="empty-cell">尚無委員會</td>
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
              <option value="secretariat_admin">秘書處 Admin</option>
            </select>
          </label>
          <label class="field md:col-span-2">
            <span>所屬委員會</span>
            <select v-model="userForm.committeeIds" multiple class="control min-h-32">
              <option
                v-for="committee in committees"
                :key="committee.id"
                :value="String(committee.id)"
              >
                {{ committee.name }}
              </option>
            </select>
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
              required
              rows="4"
              class="control"
              placeholder="姓名<email>,姓名<email>"
            ></textarea>
          </label>
          <label class="field">
            <span>權限角色</span>
            <select v-model="bulkUserForm.permissionRole" class="control">
              <option value="legislator">議員</option>
              <option value="secretariat_admin">秘書處 Admin</option>
            </select>
          </label>
          <label class="field">
            <span>所屬委員會</span>
            <select v-model="bulkUserForm.committeeIds" multiple class="control min-h-32">
              <option
                v-for="committee in committees"
                :key="committee.id"
                :value="String(committee.id)"
              >
                {{ committee.name }}
              </option>
            </select>
          </label>
          <div class="form-actions md:col-span-2">
            <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
              大量新增人員
            </button>
            <button class="btn btn-secondary" type="button" @click="resetBulkUserForm">清空</button>
          </div>
        </form>

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
                <td>{{ user.permissionRole }}</td>
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

    <div v-else class="meeting-console">
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
            <span>會議時間</span>
            <input
              v-model="meetingForm.meetingDate"
              required
              type="datetime-local"
              class="control"
            />
          </label>
          <label class="field">
            <span>提案截止</span>
            <input
              v-model="meetingForm.proposalDeadlineAt"
              required
              type="datetime-local"
              class="control"
            />
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
                <th>截止</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="meeting in meetings" :key="meeting.id">
                <td>{{ meeting.title }}</td>
                <td>{{ meeting.committeeName || getCommitteeName(meeting.committeeId) }}</td>
                <td>{{ formatSession(meeting.session) }}</td>
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
                <td colspan="5" class="empty-cell">尚無會議</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from 'vue';
  import type { Committee, Meeting, Session, User } from '~~/shared/types/bill';
  import { formatTermLabel } from '~~/shared/utils/term';

  definePageMeta({
    title: '後台資料管理',
    middleware: ['auth'],
  });

  type ResourceType = 'sessions' | 'committees' | 'users' | 'meetings';
  type AdminTab = 'reference' | 'meetings';

  const notice = ref('');
  const errorMessage = ref('');
  const isSubmitting = ref(false);
  const activeAdminTab = ref<AdminTab>('reference');
  const editingCommitteeId = ref<number | null>(null);
  const editingUserId = ref<number | null>(null);
  const editingMeetingId = ref<number | null>(null);

  const committeeForm = reactive({
    name: '',
    code: '',
  });

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
    meetingDate: '',
    proposalDeadlineAt: '',
  });

  const { data: sessionsData, refresh: refreshSessions } =
    await useFetch<Session[]>('/api/sessions');
  const { data: committeesData, refresh: refreshCommittees } =
    await useFetch<Committee[]>('/api/committees');
  const { data: usersData, refresh: refreshUsers } = await useFetch<User[]>('/api/users');
  const { data: meetingsData, refresh: refreshMeetings } =
    await useFetch<Meeting[]>('/api/meetings');

  const sessions = computed(() => sessionsData.value ?? []);
  const committees = computed(() => committeesData.value ?? []);
  const users = computed(() => usersData.value ?? []);
  const meetings = computed(() => meetingsData.value ?? []);

  async function requestJson<T>(url: string, method: string, body?: unknown): Promise<T | null> {
    errorMessage.value = '';
    notice.value = '';
    isSubmitting.value = true;

    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.statusMessage || data?.message || '操作失敗');
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
    const payload = {
      name: committeeForm.name.trim(),
      code: committeeForm.code.trim() || undefined,
    };
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
      committeeIds: userForm.committeeIds.map(Number),
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
      committeeIds: bulkUserForm.committeeIds.map(Number),
    };
    const result = await requestJson<{ users: User[] }>('/api/users/bulk', 'POST', payload);
    if (!result) return;

    resetBulkUserForm();
    notice.value = `已新增 ${result.users.length} 位人員`;
    await refreshAll();
  }

  async function submitMeeting() {
    const payload = {
      committeeId: meetingForm.committeeId ? Number(meetingForm.committeeId) : null,
      session: Number(meetingForm.session),
      title: meetingForm.title.trim(),
      meetingDate: toIsoString(meetingForm.meetingDate),
      proposalDeadlineAt: toIsoString(meetingForm.proposalDeadlineAt),
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
    committeeForm.code = committee.code;
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
    meetingForm.meetingDate = toDateTimeInput(meeting.meetingDate);
    meetingForm.proposalDeadlineAt = toDateTimeInput(meeting.proposalDeadlineAt);
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
    committeeForm.code = '';
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
    meetingForm.meetingDate = '';
    meetingForm.proposalDeadlineAt = '';
  }

  function toIsoString(value: string) {
    if (!value) return '';
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
    if (!ids.length) return '全部 / 未指定';
    return ids.map(getCommitteeName).join('、');
  }
</script>

<style scoped>
  .admin-tabs {
    display: inline-flex;
    gap: 0.35rem;
    margin-bottom: 1.25rem;
    border: 1px solid #dcdce2;
    border-radius: 8px;
    background: #f5f5f7;
    padding: 0.25rem;
  }

  .admin-tab {
    min-width: 8rem;
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

  .meeting-console {
    max-width: 980px;
  }

  .admin-section {
    border: 1px solid #dcdce2;
    border-radius: 8px;
    background: #fff;
    padding: 1.25rem;
    box-shadow: 0 10px 32px rgba(0, 0, 36, 0.05);
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
