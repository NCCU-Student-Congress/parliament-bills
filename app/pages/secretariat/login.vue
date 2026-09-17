<!-- pages/secretariat/login.vue -->
<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter, useRoute } from 'vue-router';

  const email = ref('');
  const errorMessage = ref('');
  const successMessage = ref('');
  const isLoading = ref(false);
  const router = useRouter();
  const route = useRoute();

  const handleLogin = async () => {
    errorMessage.value = '';
    successMessage.value = '';
    isLoading.value = true;

    try {
      const response = await fetch('/api/secretariat/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.value,
          redirect: route.query.redirect?.toString() || '/secretariat',
        }),
      });

      const data = await response.json();

      if (response.ok && data.authenticated) {
        sessionStorage.setItem('secretariat_authenticated', 'true');
        router.push(data.redirect || route.query.redirect?.toString() || '/secretariat');
        return;
      }

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
  <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-inter">
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">系統登入</h1>
      <p class="text-gray-600 mb-8">請輸入已登錄的人員信箱，我們會寄出登入連結。</p>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label for="email" class="sr-only">Email</label>
          <input
            type="email"
            id="email"
            v-model="email"
            required
            autocomplete="email"
            class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="name@example.com"
            :disabled="isLoading"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-md flex items-center justify-center"
        >
          <span v-if="isLoading" class="flex items-center">
            <svg
              class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            寄送中...
          </span>
          <span v-else>寄送登入連結</span>
        </button>

        <p v-if="successMessage" class="text-green-600 text-sm mt-4">{{ successMessage }}</p>
        <p v-if="errorMessage" class="text-red-500 text-sm mt-4">{{ errorMessage }}</p>
      </form>

      <p class="mt-8 text-sm text-gray-500">
        <NuxtLink to="/" class="text-blue-500 hover:underline">返回首頁</NuxtLink>
      </p>
    </div>
  </div>
</template>
