<template>
  <header class="sticky top-0 z-40 h-16 border-b border-[#dcdce2] bg-white shadow-sm print:hidden">
    <div class="relative mx-auto h-full max-w-7xl px-4">
      <div class="flex h-full items-center justify-between gap-4">
        <!-- Logo 和網站名稱 -->
        <div class="flex min-w-0 items-center">
          <NuxtLink to="/" class="flex min-w-0 items-center transition-opacity hover:opacity-80">
            <img
              src="/site-logo/nccu-student-congress.png"
              alt="國立政治大學學生議會 NCCU Student Congress"
              width="853"
              height="157"
              class="h-10 w-auto max-w-[min(62vw,300px)] object-contain"
            />
          </NuxtLink>
        </div>

        <!-- 桌面版導覽選單 -->
        <nav class="hidden items-center gap-1 md:flex">
          <NuxtLink to="/bill" class="nav-link"> 議案查詢 </NuxtLink>
          <NuxtLink to="/bill/new" class="nav-link nav-link-accent"> 新增議案 </NuxtLink>
          <NuxtLink to="/admin" class="nav-link"> 後台 </NuxtLink>
          <NuxtLink to="/secretariat" class="nav-link"> 草擬系統 </NuxtLink>
          <a
            :href="EXTERNAL_LINKS.mainWebsite"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-link"
          >
            回到會網
          </a>
          <button v-if="isAuthenticated" type="button" class="nav-link" @click="handleLogout">
            登出
          </button>
          <NuxtLink v-else to="/secretariat/login" class="nav-link"> 登入 </NuxtLink>
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
      <div
        v-if="mobileMenuOpen"
        class="absolute left-0 right-0 top-full border-b border-t border-[#dcdce2] bg-white px-4 py-4 shadow-lg md:hidden"
      >
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

          <NuxtLink to="/admin" class="mobile-nav-link" @click="closeMobileMenu"> 後台 </NuxtLink>

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
          <button
            v-if="isAuthenticated"
            type="button"
            class="mobile-nav-link"
            @click="handleLogout"
          >
            登出
          </button>
          <NuxtLink v-else to="/secretariat/login" class="mobile-nav-link" @click="closeMobileMenu">
            登入
          </NuxtLink>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup>
  import { ref, watch } from 'vue';
  import { EXTERNAL_LINKS } from '~/utils/constants.js';

  const mobileMenuOpen = ref(false);
  const isAuthenticated = ref(false);
  const route = useRoute();
  const router = useRouter();

  const toggleMobileMenu = () => {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  };

  const closeMobileMenu = () => {
    mobileMenuOpen.value = false;
  };

  const refreshSession = async () => {
    const session = await $fetch('/api/secretariat/session').catch(() => ({
      authenticated: false,
    }));
    isAuthenticated.value = Boolean(session.authenticated);
  };

  const handleLogout = async () => {
    await $fetch('/api/secretariat/logout', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => null);

    sessionStorage.removeItem('secretariat_authenticated');
    isAuthenticated.value = false;
    closeMobileMenu();

    if (route.path.startsWith('/admin') || route.path.startsWith('/secretariat')) {
      await router.push('/secretariat/login');
    }
  };

  // 點擊外部關閉選單
  onMounted(() => {
    refreshSession();

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

  watch(
    () => route.fullPath,
    () => {
      refreshSession();
    },
  );
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
