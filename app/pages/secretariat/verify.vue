<!-- pages/secretariat/verify.vue -->
<script setup lang="ts">
  import { ref } from 'vue';
  import { useRoute } from 'vue-router';

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
  <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-inter">
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">確認登入</h1>
      <p class="text-gray-600 mb-8">
        請確認是你本人申請登入議案系統。如果你沒有申請，請直接關閉此頁面。
      </p>

      <LoadingButton
        type="button"
        :loading="isLoading"
        :disabled="!token"
        loading-label="登入中"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-md flex items-center justify-center"
        @click="handleVerify"
      >
        登入議案系統
      </LoadingButton>

      <p v-if="errorMessage" class="text-red-500 text-sm mt-4">{{ errorMessage }}</p>

      <p class="mt-8 text-sm text-gray-500">
        <NuxtLink to="/secretariat/login" class="text-blue-500 hover:underline"
          >重新申請登入連結</NuxtLink
        >
      </p>
    </div>
  </div>
</template>
