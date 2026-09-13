<template>
  <div class="space-y-10">
    <section class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div
        class="rounded-xl border border-[#dcdce2] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,36,0.06)] sm:p-8"
      >
        <p class="mb-3 text-sm font-black text-[#e60012]">
          {{ SITE_CONFIG.fullName }}
        </p>
        <h1 class="max-w-4xl text-4xl font-black leading-tight text-[#12122b] sm:text-5xl">
          {{ SITE_CONFIG.name }}
        </h1>
        <p class="mt-5 max-w-2xl text-lg font-bold leading-relaxed text-[#5a5a70]">
          查詢議案、檢視委員會報告，並提供秘書處草擬議事文件的日常工作入口。
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <NuxtLink to="/bill" class="btn btn-primary">議案查詢</NuxtLink>
          <NuxtLink to="/bill/new" class="btn btn-secondary">新增議案</NuxtLink>
        </div>
      </div>

      <aside
        class="grid overflow-hidden rounded-xl border border-primary bg-gradient-to-br from-[#1c1c4a] via-[#000024] to-[#000018] text-white shadow-[0_10px_40px_rgba(0,0,36,0.16)]"
      >
        <div class="border-b border-white/20 p-5">
          <p class="text-xs font-black text-[#ff4d5a]">目前屆次</p>
          <p class="mt-2 text-4xl font-black">第 {{ getCurrentTerm() }} 屆</p>
        </div>
        <div class="grid grid-cols-2">
          <div class="border-r border-white/20 p-5">
            <p class="text-xs font-black text-[#ff4d5a]">議案總數</p>
            <p class="mt-2 text-3xl font-black">{{ stats.totalBills }}</p>
          </div>
          <div class="p-5">
            <p class="text-xs font-black text-[#ff4d5a]">本屆議案</p>
            <p class="mt-2 text-3xl font-black">{{ stats.thisTermBills }}</p>
          </div>
        </div>
        <div class="p-5 text-sm font-bold leading-relaxed text-white/80">
          資料欄位維持既有格式，供議事查詢與內部作業使用。
        </div>
      </aside>
    </section>

    <section>
      <div class="mb-4 flex items-end justify-between gap-4 border-b border-[#dcdce2] pb-3">
        <div>
          <p class="text-sm font-black text-[#e60012]">常用功能</p>
          <h2 class="text-2xl font-black text-[#12122b]">服務入口</h2>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <NuxtLink to="/bill" class="home-module">
          <span class="home-module-kicker">議案資料</span>
          <strong>議案查詢</strong>
          <span>查詢歷屆議案資料，支援多種篩選條件和分頁瀏覽。</span>
        </NuxtLink>

        <NuxtLink to="/committee-reports" class="home-module">
          <span class="home-module-kicker">委員會</span>
          <strong>委員會報告</strong>
          <span>委員會建議報告及學生會回覆。</span>
        </NuxtLink>

        <NuxtLink to="/secretariat" class="home-module">
          <span class="home-module-kicker">秘書處</span>
          <strong>文件草擬輔助</strong>
          <span>供秘書處內部用以輔助草擬議事文件。</span>
        </NuxtLink>

        <div class="home-module">
          <span class="home-module-kicker">聯絡資訊</span>
          <strong>聯絡我們</strong>
          <a
            :href="ORG_DATA.officeLocationUrl"
            class="font-black text-primary underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            辦公室：{{ ORG_DATA.office }}
          </a>
          <a
            :href="`mailto:${ORG_DATA.email}`"
            class="mt-auto font-black text-primary underline underline-offset-4"
          >
            {{ ORG_DATA.email }}
          </a>
        </div>
      </div>
    </section>

    <!-- 統計資訊 (維護中) -->
    <!-- <div class="mt-12 bg-gray-50 rounded-lg p-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">
        系統統計(維護中)
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-secondary mb-2">{{ stats.totalBills }}</div>
          <div class="text-gray-600">總議案數</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-secondary mb-2">{{ getCurrentTerm() }}</div>
          <div class="text-gray-600">目前屆次</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-secondary mb-2">{{ stats.thisTermBills }}</div>
          <div class="text-gray-600">本屆議案數</div>
        </div>
      </div>
    </div>-->
  </div>
</template>

<script setup>
  // 設定頁面 meta 標籤
  useHead({
    title: SITE_CONFIG.name,
    meta: [
      { name: 'description', content: '國立臺北大學學生自治會三峽校區學生議會議事服務系統首頁' },
    ],
  });

  // 統計資料
  const stats = ref({
    totalBills: 0,
    thisTermBills: 0,
  });

  // 載入統計資料
  onMounted(async () => {
    try {
      const { data } = await $fetch('/api/bills/stats');
      if (data) {
        stats.value = data;
      }
    } catch (error) {
      console.error('載入統計資料失敗:', error);
    }
  });

  import { getCurrentTerm } from '../../shared/utils/term.js';

  import { ORG_DATA, SITE_CONFIG } from '~/utils/constants.js';
</script>

<style scoped>
  .home-module {
    display: flex;
    min-height: 14rem;
    flex-direction: column;
    gap: 0.75rem;
    border: 1px solid #dcdce2;
    border-radius: 12px;
    background: #ffffff;
    padding: 1.25rem;
    box-shadow: 0 10px 40px rgba(0, 0, 36, 0.05);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      background-color 160ms ease;
  }

  .home-module:hover {
    border-color: #000024;
    box-shadow: 0 14px 34px rgba(0, 0, 36, 0.12);
    transform: translateY(-3px);
  }

  .home-module-kicker {
    color: #e60012;
    font-size: 0.75rem;
    font-weight: 900;
  }

  .home-module strong {
    color: #12122b;
    font-size: 1.35rem;
    font-weight: 900;
    line-height: 1.3;
  }

  .home-module span {
    color: #5a5a70;
    font-size: 0.95rem;
    font-weight: 650;
    line-height: 1.65;
  }
</style>
