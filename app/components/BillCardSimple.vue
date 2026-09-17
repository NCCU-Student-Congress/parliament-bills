<template>
  <NuxtLink :to="`/bill/proposal/${bill.id}`" target="_blank" rel="noopener">
    <div class="bill-card cursor-pointer">
      <p class="mb-2 text-base font-black leading-relaxed text-[#12122b]">
        {{ bill.subject }}
      </p>
      <p class="mb-4 text-sm font-bold text-[#5a5a70]">
        {{ bill.committeeName }} · {{ bill.meetingTitle }}
      </p>
      <div class="text-sm font-semibold leading-relaxed text-[#12122b]">
        <p><strong>提案人：</strong>{{ bill.proposerName }}</p>
        <p><strong>提案時間：</strong>{{ formatDateTime(bill.proposedAt) }}</p>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
  defineProps({
    bill: {
      type: Object,
      required: true,
    },
  });

  const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
</script>
