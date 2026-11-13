<!-- pages/secretariat/verify.vue -->
<script setup lang="ts">
  import { ref } from 'vue';
  import { useRoute } from 'vue-router';
  import { SITE_CONFIG } from '~/utils/constants.js';

  // The token is in this page's URL, so never send it to other sites as a referrer.
  useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] });

  const route = useRoute();
  const token = route.query.token?.toString() ?? '';
  const errorMessage = ref(token ? '' : '登入連結不正確，請重新申請。');
  const isLoading = ref(false);

  const handleVerify = async () => {
    errorMessage.value = '';
    isLoading.value = true;

    try {
      const response = await fetch('/api/secretariat/auth/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && typeof data.redirect === 'string') {
        sessionStorage.setItem('secretariat_authenticated', 'true');
        window.location.replace(data.redirect);
        return;
      }

      errorMessage.value = data.message || '登入連結已失效，請重新申請。';
    } catch (error) {
      console.error('登入驗證失敗:', error);
      errorMessage.value = '網路錯誤或伺服器無回應，請稍後再試。';
    } finally {
      isLoading.value = false;
    }
  };
</script>

<template>
  <section class="mx-auto w-full max-w-md">
    <div
      class="rounded-xl border border-[#dcdce2] border-t-4 border-t-primary bg-white p-5 shadow-[0_10px_40px_rgba(0,0,36,0.06)] sm:p-8"
    >
      <p class="mb-2 text-sm font-black text-[#e60012] sm:mb-3">{{ SITE_CONFIG.fullName }}</p>
      <h1 class="text-2xl font-black leading-tight text-[#12122b] sm:text-3xl">確認登入</h1>
      <p class="mt-3 text-sm font-bold leading-relaxed text-[#5a5a70] sm:mt-4 sm:text-base">
        請確認是你本人申請登入議案系統。如果你沒有申請，請直接關閉此頁面。
      </p>

      <LoadingButton
        type="button"
        :loading="isLoading"
        :disabled="!token"
        loading-label="登入中"
        class="btn btn-primary mt-6 w-full sm:mt-8 disabled:cursor-not-allowed disabled:opacity-60"
        @click="handleVerify"
      >
        登入議案系統
      </LoadingButton>

      <p
        v-if="errorMessage"
        role="alert"
        class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <div class="mt-6 border-t border-[#dcdce2] pt-4 text-sm sm:mt-8 sm:pt-5">
        <NuxtLink
          to="/secretariat/login"
          class="font-bold text-primary hover:text-[#e60012] hover:underline"
        >
          重新申請登入連結
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
