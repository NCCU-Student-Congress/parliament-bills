<template>
  <div>
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
          查詢議案，並提供秘書處草擬議事文件的日常工作入口。
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
          <p class="text-xs font-black text-[#ff4d5a]">目前會期</p>
          <p class="mt-2 text-4xl font-black">{{ formatTermLabel(getCurrentTerm()) }}</p>
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
      </aside>
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
          <div class="text-3xl font-bold text-secondary mb-2">
            {{ formatTermLabel(getCurrentTerm()) }}
          </div>
          <div class="text-gray-600">目前會期</div>
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
    meta: [{ name: 'description', content: '國立政治大學學生議會議事服務系統首頁' }],
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

  import { formatTermLabel, getCurrentTerm } from '../../shared/utils/term.js';

  import { SITE_CONFIG } from '~/utils/constants.js';
</script>
