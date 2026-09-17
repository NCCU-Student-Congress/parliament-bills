<template>
  <div class="container mx-auto px-4 py-12">
    <p class="text-gray-600">正在開啟議案詳情...</p>
  </div>
</template>

<script setup lang="ts">
  import { createError, navigateTo, useRoute } from '#app';
  import type { Bill } from '~~/shared/types/bill';
  import { parseTermCode } from '~~/shared/utils/term';

  const route = useRoute();
  const term = parseTermCode(route.params.term);
  const id = parseInt(route.params.number as string, 10);

  if (!term || !id || isNaN(id)) {
    throw createError({
      statusCode: 404,
      statusMessage: '議案參數欠缺或非數值',
    });
  }

  const bill = await $fetch<Bill>(`/api/bills/${term}/${id}`).catch(
    (error: { status?: number; statusCode?: number }) => {
      if (error.status === 404 || error.statusCode === 404) {
        throw createError({
          statusCode: 404,
          statusMessage: '找不到該議案',
        });
      }

      throw error;
    },
  );

  await navigateTo(`/bill/proposal/${bill.id}`, { replace: true });
</script>
