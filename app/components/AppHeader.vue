<template>
  <header class="sticky top-0 z-40 h-16 border-b border-[#dcdce2] bg-white shadow-sm print:hidden">
    <div class="relative mx-auto h-full max-w-7xl px-4">
      <div class="flex h-full items-center justify-between gap-4">
        <!-- Logo 和網站名稱 -->
        <div class="flex min-w-0 items-center">
          <NuxtLink
            to="/"
            class="flex min-w-0 items-center transition-opacity hover:opacity-80"
            @click="closeMobileMenu"
          >
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
        <nav class="hidden items-center gap-1 xl:flex">
          <NuxtLink to="/bill" class="nav-link"> 議案查詢 </NuxtLink>
          <NuxtLink to="/cosign" class="nav-link"> 連署 </NuxtLink>
          <NuxtLink to="/bill/new" class="nav-link nav-link-accent"> 新增議案 </NuxtLink>
          <NuxtLink v-if="isSecretariat" to="/admin" class="nav-link"> 後台 </NuxtLink>
          <a
            :href="EXTERNAL_LINKS.mainWebsite"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-link"
          >
            回到會網
          </a>
          <button v-if="isAuthenticated" type="button" class="auth-link" @click="handleLogout">
            登出
          </button>
          <NuxtLink v-else to="/secretariat/login" class="auth-link"> 登入 </NuxtLink>
        </nav>

        <!-- 行動版選單按鈕 -->
        <div class="flex items-center xl:hidden">
          <button
            ref="mobileMenuButton"
            @click="toggleMobileMenu"
            class="mobile-menu-button"
            :class="{ 'is-open': mobileMenuOpen }"
            type="button"
            :aria-label="mobileMenuOpen ? '關閉導覽選單' : '開啟導覽選單'"
            :aria-expanded="mobileMenuOpen"
            aria-controls="mobile-navigation"
          >
            <span class="mobile-menu-icon" aria-hidden="true">
              <span></span><span></span><span></span>
            </span>
          </button>
        </div>
      </div>

      <Transition name="mobile-backdrop">
        <div
          v-if="mobileMenuOpen"
          class="mobile-menu-backdrop xl:hidden"
          @click="closeMobileMenu"
        ></div>
      </Transition>

      <!-- 行動版選單 -->
      <Transition name="mobile-panel">
        <nav
          v-show="mobileMenuOpen"
          id="mobile-navigation"
          aria-label="手機導覽"
          class="mobile-menu-panel xl:hidden"
        >
          <div class="mobile-menu-heading">
            <span>導覽選單</span>
            <span class="mobile-menu-heading-line"></span>
            <span>MENU</span>
          </div>

          <div class="mobile-menu-primary">
            <NuxtLink to="/bill" class="mobile-menu-link" @click="closeMobileMenu">
              <span class="mobile-menu-link-copy">
                <strong>議案查詢</strong>
                <small>瀏覽會議與議案</small>
              </span>
              <span class="mobile-menu-arrow" aria-hidden="true">→</span>
            </NuxtLink>
            <NuxtLink to="/cosign" class="mobile-menu-link" @click="closeMobileMenu">
              <span class="mobile-menu-link-copy">
                <strong>連署</strong>
                <small>參與議案連署</small>
              </span>
              <span class="mobile-menu-arrow" aria-hidden="true">→</span>
            </NuxtLink>
            <NuxtLink
              v-if="isSecretariat"
              to="/admin"
              class="mobile-menu-link"
              @click="closeMobileMenu"
            >
              <span class="mobile-menu-link-copy">
                <strong>後台</strong>
                <small>秘書處管理</small>
              </span>
              <span class="mobile-menu-arrow" aria-hidden="true">→</span>
            </NuxtLink>
          </div>

          <NuxtLink to="/bill/new" class="mobile-menu-action" @click="closeMobileMenu">
            <span>
              <strong>新增議案</strong>
              <small>提出你的提案</small>
            </span>
            <span class="mobile-menu-action-arrow" aria-hidden="true">→</span>
          </NuxtLink>

          <div class="mobile-menu-utility">
            <a
              :href="EXTERNAL_LINKS.mainWebsite"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeMobileMenu"
              >回到會網 <span aria-hidden="true">↗</span></a
            >
            <button v-if="isAuthenticated" type="button" @click="handleLogout">登出</button>
            <NuxtLink v-else to="/secretariat/login" @click="closeMobileMenu">登入</NuxtLink>
          </div>
        </nav>
      </Transition>
    </div>
  </header>
</template>

<script setup>
  import { ref, watch } from 'vue';
  import { EXTERNAL_LINKS } from '~/utils/constants.js';

  const mobileMenuOpen = ref(false);
  const isAuthenticated = ref(false);
  const isSecretariat = ref(false);
  const sessionCheck = useSecretariatSessionCheck();
  const route = useRoute();

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
    isSecretariat.value = session.role === 'secretariat_admin';
    sessionCheck.value = session.authenticated ? { session, checkedAt: Date.now() } : null;
  };

  const handleLogout = async () => {
    await $fetch('/api/secretariat/logout', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => null);

    sessionStorage.removeItem('secretariat_authenticated');
    isAuthenticated.value = false;
    isSecretariat.value = false;
    closeMobileMenu();

    if (window.location.pathname === '/' && !window.location.search && !window.location.hash) {
      window.location.reload();
    } else {
      window.location.replace('/');
    }
  };

  const mobileMenuButton = ref(null);

  onMounted(() => {
    refreshSession();

    const handleClickOutside = (event) => {
      if (mobileMenuOpen.value && !event.target.closest('header')) {
        closeMobileMenu();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape' && mobileMenuOpen.value) {
        closeMobileMenu();
        mobileMenuButton.value?.focus();
      }
    };

    const desktopQuery = window.matchMedia('(min-width: 1280px)');
    const handleDesktop = (event) => {
      if (event.matches) closeMobileMenu();
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    desktopQuery.addEventListener('change', handleDesktop);

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      desktopQuery.removeEventListener('change', handleDesktop);
    });
  });

  watch(() => route.fullPath, closeMobileMenu);
  // Query-only changes, such as switching admin tabs, keep the same login state.
  watch(() => route.path, refreshSession);
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

  .auth-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.25rem;
    padding: 0.45rem 0.9rem;
    border: 2px solid #000024;
    border-radius: 8px;
    background: #fff;
    color: #000024;
    font-size: 0.875rem;
    font-weight: 900;
    transition:
      background-color 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }

  .auth-link:hover,
  .auth-link.router-link-active {
    background: #000024;
    color: #fff;
    transform: translateY(-1px);
  }

  .mobile-menu-button {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid #dcdce2;
    border-radius: 13px;
    color: #000024;
    background: #fff;
    transition:
      background-color 200ms ease,
      border-color 200ms ease,
      color 200ms ease;
  }

  .mobile-menu-button:hover,
  .mobile-menu-button.is-open {
    border-color: #000024;
    background: #000024;
    color: #fff;
  }

  .mobile-menu-button:focus-visible,
  .mobile-menu-panel :is(a, button):focus-visible {
    outline: 3px solid #e60012;
    outline-offset: 3px;
  }

  .mobile-menu-icon {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 20px;
    height: 20px;
  }

  .mobile-menu-icon span {
    display: block;
    width: 100%;
    height: 2px;
    border-radius: 2px;
    background: currentColor;
    transition:
      transform 240ms ease,
      opacity 160ms ease;
  }

  .mobile-menu-button.is-open .mobile-menu-icon span:first-child {
    transform: translateY(7px) rotate(45deg);
  }

  .mobile-menu-button.is-open .mobile-menu-icon span:nth-child(2) {
    opacity: 0;
    transform: scaleX(0.4);
  }

  .mobile-menu-button.is-open .mobile-menu-icon span:last-child {
    transform: translateY(-7px) rotate(-45deg);
  }

  .mobile-menu-backdrop {
    position: fixed;
    z-index: 1;
    inset: 4rem 0 0;
    background: rgb(0 0 36 / 28%);
  }

  .mobile-menu-panel {
    position: absolute;
    z-index: 2;
    inset: 100% 0 auto;
    max-height: calc(100dvh - 4rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1.5rem 1.5rem max(1.5rem, env(safe-area-inset-bottom));
    border-top: 1px solid #e7e7eb;
    border-radius: 0 0 24px 24px;
    background: #fafafb;
    box-shadow: 0 22px 40px rgb(0 0 36 / 16%);
  }

  .mobile-menu-heading {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    color: #66667d;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  .mobile-menu-heading-line {
    flex: 1;
    height: 1px;
    background: #dedee4;
  }

  .mobile-menu-primary {
    margin: 0.7rem 0 1.2rem;
  }

  .mobile-menu-link {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 4.55rem;
    padding: 0.7rem 0.15rem;
    border-bottom: 1px solid #e7e7eb;
    color: #000024;
    transition:
      padding-inline 180ms ease,
      color 180ms ease;
  }

  .mobile-menu-link:hover,
  .mobile-menu-link.router-link-exact-active {
    padding-inline: 0.65rem;
    color: #c90010;
  }

  .mobile-menu-link.router-link-exact-active::before {
    position: absolute;
    inset: 1.2rem auto 1.2rem 0;
    width: 3px;
    border-radius: 3px;
    background: currentColor;
    content: '';
  }

  .mobile-menu-link-copy,
  .mobile-menu-action > span:first-child {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
  }

  .mobile-menu-link strong,
  .mobile-menu-action strong {
    font-size: 1.125rem;
    font-weight: 900;
    line-height: 1.35;
  }

  .mobile-menu-link small,
  .mobile-menu-action small {
    color: #66667d;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .mobile-menu-arrow {
    font-size: 1.25rem;
    font-weight: 400;
    transition: transform 180ms ease;
  }

  .mobile-menu-link:hover .mobile-menu-arrow,
  .mobile-menu-action:hover .mobile-menu-action-arrow {
    transform: translate(2px, -2px);
  }

  .mobile-menu-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 4.5rem;
    padding: 0.8rem 1rem;
    border-radius: 14px;
    background: #e60012;
    color: #fff;
    transition:
      background-color 180ms ease,
      transform 180ms ease;
  }

  .mobile-menu-action:hover {
    background: #bd0010;
    transform: translateY(-2px);
  }

  .mobile-menu-action small {
    color: rgb(255 255 255 / 85%);
  }

  .mobile-menu-action-arrow {
    font-size: 1.4rem;
    transition: transform 180ms ease;
  }

  .mobile-menu-utility {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1.3rem;
    color: #36364e;
    font-size: 0.875rem;
    font-weight: 700;
  }

  .mobile-menu-utility :is(a, button) {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .mobile-menu-utility :is(a, button):hover {
    color: #c90010;
  }

  .mobile-backdrop-enter-active,
  .mobile-backdrop-leave-active {
    transition: opacity 240ms ease;
  }

  .mobile-panel-enter-active,
  .mobile-panel-leave-active {
    transition:
      opacity 240ms ease,
      translate 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .mobile-backdrop-enter-from,
  .mobile-backdrop-leave-to {
    opacity: 0;
  }

  .mobile-panel-enter-from,
  .mobile-panel-leave-to {
    opacity: 0;
    translate: 0 -10px;
  }

  @media (forced-colors: active) {
    .mobile-menu-link.router-link-exact-active {
      outline: 2px solid Highlight;
      outline-offset: -2px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mobile-menu-button,
    .mobile-menu-icon span,
    .mobile-menu-link,
    .mobile-menu-arrow,
    .mobile-menu-action,
    .mobile-menu-action-arrow,
    .mobile-backdrop-enter-active,
    .mobile-backdrop-leave-active,
    .mobile-panel-enter-active,
    .mobile-panel-leave-active {
      transition-duration: 0.01ms;
    }
  }
</style>
