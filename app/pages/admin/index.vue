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

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="admin-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">Sessions</p>
            <h2 class="section-title">會期</h2>
          </div>
        </div>

        <form class="form-grid" @submit.prevent="createSession">
          <label class="field">
            <span>會期代碼</span>
            <input v-model="sessionForm.id" required class="control" placeholder="271 或 27-1" />
          </label>
          <label class="field">
            <span>名稱</span>
            <input v-model="sessionForm.title" class="control" placeholder="27-1 會期" />
          </label>
          <label class="field">
            <span>開始日期</span>
            <input v-model="sessionForm.startsAt" type="date" class="control" />
          </label>
          <label class="field">
            <span>結束日期</span>
            <input v-model="sessionForm.endsAt" type="date" class="control" />
          </label>
          <button class="btn btn-primary form-submit" type="submit" :disabled="isSubmitting">
            新增會期
          </button>
        </form>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>代碼</th>
                <th>名稱</th>
                <th>期間</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in sessions" :key="session.id">
                <td>{{ session.id }}</td>
                <td>{{ session.title }}</td>
                <td>{{ formatRange(session.startsAt, session.endsAt) }}</td>
              </tr>
              <tr v-if="sessions.length === 0">
                <td colspan="3" class="empty-cell">尚無會期</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="admin-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">Committees</p>
            <h2 class="section-title">委員會</h2>
          </div>
        </div>

        <form class="form-grid" @submit.prevent="createCommittee">
          <label class="field">
            <span>名稱</span>
            <input v-model="committeeForm.name" required class="control" placeholder="程序委員會" />
          </label>
          <label class="field">
            <span>代碼</span>
            <input v-model="committeeForm.code" class="control" placeholder="procedure" />
          </label>
          <button class="btn btn-primary form-submit" type="submit" :disabled="isSubmitting">
            新增委員會
          </button>
        </form>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>名稱</th>
                <th>代碼</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="committee in committees" :key="committee.id">
                <td>{{ committee.name }}</td>
                <td>{{ committee.code || '無' }}</td>
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
          <div>
            <p class="section-kicker">Users</p>
            <h2 class="section-title">人員</h2>
          </div>
        </div>

        <form class="form-grid" @submit.prevent="createUser">
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
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
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
          <button class="btn btn-primary form-submit" type="submit" :disabled="isSubmitting">
            新增人員
          </button>
        </form>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>Email</th>
                <th>權限</th>
                <th>委員會</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.permissionRole }}</td>
                <td>{{ getCommitteeNames(user.committeeIds) }}</td>
              </tr>
              <tr v-if="users.length === 0">
                <td colspan="4" class="empty-cell">尚無人員</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="admin-section">
        <div class="section-head">
          <div>
            <p class="section-kicker">Meetings</p>
            <h2 class="section-title">會議</h2>
          </div>
        </div>

        <form class="form-grid" @submit.prevent="createMeeting">
          <label class="field">
            <span>委員會</span>
            <select v-model="meetingForm.committeeId" required class="control">
              <option value="">請選擇</option>
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
          <button class="btn btn-primary form-submit" type="submit" :disabled="isSubmitting">
            新增會議
          </button>
        </form>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>會議</th>
                <th>委員會</th>
                <th>會期</th>
                <th>截止</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="meeting in meetings" :key="meeting.id">
                <td>{{ meeting.title }}</td>
                <td>{{ meeting.committeeName || getCommitteeName(meeting.committeeId) }}</td>
                <td>{{ formatSession(meeting.session) }}</td>
                <td>{{ formatDateTime(meeting.proposalDeadlineAt) }}</td>
              </tr>
              <tr v-if="meetings.length === 0">
                <td colspan="4" class="empty-cell">尚無會議</td>
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
  import { formatTermLabel, parseTermCode } from '~~/shared/utils/term';

  definePageMeta({
    title: '後台資料管理',
  });

  const notice = ref('');
  const errorMessage = ref('');
  const isSubmitting = ref(false);

  const sessionForm = reactive({
    id: '',
    title: '',
    startsAt: '',
    endsAt: '',
  });

  const committeeForm = reactive({
    name: '',
    code: '',
  });

  const userForm = reactive({
    name: '',
    email: '',
    permissionRole: 'viewer',
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

  async function postJson<T>(url: string, body: unknown): Promise<T> {
    errorMessage.value = '';
    notice.value = '';
    isSubmitting.value = true;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.statusMessage || data?.message || '寫入失敗');
      }

      return data as T;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '寫入失敗';
      throw error;
    } finally {
      isSubmitting.value = false;
    }
  }

  async function refreshAll() {
    await Promise.all([refreshSessions(), refreshCommittees(), refreshUsers(), refreshMeetings()]);
  }

  async function createSession() {
    const id = parseTermCode(sessionForm.id);
    if (!id) {
      errorMessage.value = '會期代碼格式錯誤';
      return;
    }

    await postJson<Session>('/api/sessions', {
      id,
      title: sessionForm.title.trim() || formatTermLabel(id),
      startsAt: sessionForm.startsAt,
      endsAt: sessionForm.endsAt,
    });

    sessionForm.id = '';
    sessionForm.title = '';
    sessionForm.startsAt = '';
    sessionForm.endsAt = '';
    notice.value = '已新增會期';
    await refreshAll();
  }

  async function createCommittee() {
    await postJson<Committee>('/api/committees', {
      name: committeeForm.name.trim(),
      code: committeeForm.code.trim() || undefined,
    });

    committeeForm.name = '';
    committeeForm.code = '';
    notice.value = '已新增委員會';
    await refreshAll();
  }

  async function createUser() {
    await postJson<User>('/api/users', {
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      permissionRole: userForm.permissionRole,
      committeeIds: userForm.committeeIds.map(Number),
    });

    userForm.name = '';
    userForm.email = '';
    userForm.permissionRole = 'viewer';
    userForm.committeeIds = [];
    notice.value = '已新增人員';
    await refreshAll();
  }

  async function createMeeting() {
    await postJson<Meeting>('/api/meetings', {
      committeeId: Number(meetingForm.committeeId),
      session: Number(meetingForm.session),
      title: meetingForm.title.trim(),
      meetingDate: toIsoString(meetingForm.meetingDate),
      proposalDeadlineAt: toIsoString(meetingForm.proposalDeadlineAt),
    });

    meetingForm.title = '';
    meetingForm.meetingDate = '';
    meetingForm.proposalDeadlineAt = '';
    notice.value = '已新增會議';
    await refreshAll();
  }

  function toIsoString(value: string) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
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

  function formatSession(session: number) {
    return sessions.value.find((item) => item.id === session)?.title ?? formatTermLabel(session);
  }

  function getCommitteeName(id: number) {
    return committees.value.find((committee) => committee.id === id)?.name ?? '未設定';
  }

  function getCommitteeNames(ids: number[]) {
    if (!ids.length) return '全部 / 未指定';
    return ids.map(getCommitteeName).join('、');
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

  .section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #dcdce2;
    padding-bottom: 0.75rem;
  }

  .section-kicker {
    color: #e60012;
    font-size: 0.75rem;
    font-weight: 900;
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

  .control:focus {
    border-color: #e60012;
    outline: 3px solid rgba(230, 0, 18, 0.18);
  }

  .form-submit {
    align-self: end;
    justify-content: center;
  }

  .table-wrap {
    margin-top: 1.25rem;
    overflow-x: auto;
  }

  .admin-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 520px;
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

  .empty-cell {
    color: #5a5a70 !important;
    text-align: center;
  }
</style>
