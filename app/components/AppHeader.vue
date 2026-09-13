<template>
  <header
    class="sticky top-0 z-40 border-b border-[#dcdce2] bg-white/95 shadow-sm backdrop-blur print:hidden"
  >
    <div class="mx-auto max-w-7xl px-4">
      <div class="flex min-h-16 items-center justify-between gap-4">
        <!-- Logo 和網站名稱 -->
        <div class="flex min-w-0 items-center">
          <NuxtLink
            to="/"
            class="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                ></path>
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black text-primary">議事資訊系統</p>
              <h1 class="truncate text-lg font-black text-[#12122b] sm:text-xl">
                {{ SITE_CONFIG.name }}
              </h1>
            </div>
          </NuxtLink>
        </div>

        <!-- 桌面版導覽選單 -->
        <nav class="hidden items-center gap-1 md:flex">
          <NuxtLink to="/bill" class="nav-link"> 議案查詢 </NuxtLink>
          <NuxtLink to="/bill/new" class="nav-link nav-link-accent"> 新增議案 </NuxtLink>
          <NuxtLink to="/committee-reports" class="nav-link"> 委員會報告 </NuxtLink>
          <NuxtLink to="/secretariat" class="nav-link"> 草擬系統 </NuxtLink>
          <a
            :href="EXTERNAL_LINKS.mainWebsite"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-link"
          >
            回到會網
          </a>
        </nav>

        <!-- 行動版選單按鈕 -->
        <div class="flex items-center md:hidden">
          <button
            @click="toggleMobileMenu"
            class="rounded-lg border border-[#dcdce2] bg-white p-2 text-primary transition-colors hover:bg-primary hover:text-white"
            type="button"
            aria-label="開啟導覽選單"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- 行動版選單 -->
      <div v-if="mobileMenuOpen" class="border-t border-[#dcdce2] py-4 md:hidden">
        <nav class="flex flex-col gap-2">
          <NuxtLink to="/bill" class="mobile-nav-link" @click="closeMobileMenu">
            議案查詢
          </NuxtLink>

          <NuxtLink
            to="/bill/new"
            class="mobile-nav-link mobile-nav-link-accent"
            @click="closeMobileMenu"
          >
            新增議案
          </NuxtLink>

          <NuxtLink to="/committee-reports" class="mobile-nav-link" @click="closeMobileMenu">
            委員會報告
          </NuxtLink>
          <NuxtLink to="/secretariat" class="mobile-nav-link" @click="closeMobileMenu">
            草擬系統
          </NuxtLink>
          <a
            :href="EXTERNAL_LINKS.mainWebsite"
            target="_blank"
            rel="noopener noreferrer"
            class="mobile-nav-link"
          >
            回到會網
          </a>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup>
  import { ref } from 'vue';
  import { EXTERNAL_LINKS, SITE_CONFIG } from '~/utils/constants.js';

  const mobileMenuOpen = ref(false);

  const toggleMobileMenu = () => {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  };

  const closeMobileMenu = () => {
    mobileMenuOpen.value = false;
  };

  // 點擊外部關閉選單
  onMounted(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen.value && !event.target.closest('header')) {
        mobileMenuOpen.value = false;
      }
    };

    document.addEventListener('click', handleClickOutside);

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });
  });
</script>

<style scoped>
  .nav-link {
    display: inline-flex;
    align-items: center;
    min-height: 2.25rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 999px;
    color: #12122b;
    font-size: 0.875rem;
    font-weight: 800;
    transition:
      background-color 160ms ease,
      border-color 160ms ease,
      color 160ms ease;
  }

  .nav-link:hover,
  .nav-link.router-link-active {
    border-color: #000024;
    background: #000024;
    color: #fff;
  }

  .nav-link-accent {
    border-color: #e60012;
    color: #e60012;
  }

  .nav-link-accent:hover,
  .nav-link-accent.router-link-active {
    background: #e60012;
    border-color: #e60012;
    color: #fff;
  }

  .mobile-nav-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 2.75rem;
    border: 1px solid #dcdce2;
    border-radius: 12px;
    background: #fff;
    padding: 0.65rem 0.75rem;
    color: #12122b;
    font-weight: 800;
  }

  .mobile-nav-link-accent {
    border-color: #e60012;
    color: #e60012;
  }
</style>
