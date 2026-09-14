<template>
  <div class="container mx-auto px-4 py-12">
    <p class="text-gray-600">正在開啟議案詳情...</p>
  </div>
</template>

<script setup lang="ts">
  import { createError, navigateTo, useRoute } from '#app';

  const route = useRoute();
  const id = parseInt(route.params.rowIndex as string, 10);

  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 404,
      statusMessage: '議案參數欠缺或非數值',
    });
  }

  await navigateTo(`/bill/proposal/${id}`, { replace: true });
</script>
