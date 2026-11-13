<!-- pages/secretariat/login.vue -->
<script setup lang="ts">
  import { ref } from 'vue';
  import { useRoute } from 'vue-router';
  import { SITE_CONFIG } from '~/utils/constants.js';

  const email = ref('');
  const errorMessage = ref('');
  const successMessage = ref('');
  const isLoading = ref(false);
  const route = useRoute();

  const handleLogin = async () => {
    errorMessage.value = '';
    successMessage.value = '';
    isLoading.value = true;

    try {
      const response = await fetch('/api/secretariat/auth', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.value,
          redirect: route.query.redirect?.toString(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.sent) {
        successMessage.value = data.message || '登入連結已寄出，請檢查你的信箱。';
        return;
      }

      errorMessage.value = data.message || '登入請求失敗，請稍後再試。';
    } catch (error) {
      console.error('登入請求失敗:', error);
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
      <h1 class="text-2xl font-black leading-tight text-[#12122b] sm:text-3xl">系統登入</h1>
      <p class="mt-3 text-sm font-bold leading-relaxed text-[#5a5a70] sm:mt-4 sm:text-base">
        請輸入已登錄的人員信箱，我們會寄出登入連結。
      </p>

      <form @submit.prevent="handleLogin" class="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
        <div>
          <label for="email" class="mb-1.5 block text-sm font-black text-[#12122b]">人員信箱</label>
          <input
            type="text"
            id="email"
            v-model="email"
            required
            inputmode="email"
            autocomplete="email"
            class="w-full px-4 py-2.5 disabled:opacity-60 sm:py-3"
            placeholder="name@example.com"
            :disabled="isLoading"
          />
        </div>

        <LoadingButton
          type="submit"
          :loading="isLoading"
          loading-label="寄送登入連結中"
          class="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          寄送登入連結
        </LoadingButton>

        <p
          v-if="successMessage"
          role="status"
          class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {{ successMessage }}
        </p>
        <p
          v-if="errorMessage"
          role="alert"
          class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ errorMessage }}
        </p>
      </form>

      <div class="mt-6 border-t border-[#dcdce2] pt-4 text-sm sm:mt-8 sm:pt-5">
        <NuxtLink to="/" class="font-bold text-primary hover:text-[#e60012] hover:underline">
          返回首頁
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
