<template>
  <NuxtLink
    :to="
      bill.billNumber !== ''
        ? `/bill/${bill.term}/${bill.serialNumber}`
        : `/bill/unnumbered/${bill.rowIndex}`
    "
    target="_blank"
    rel="noopener"
  >
    <div class="bill-card cursor-pointer">
      <h3>
        {{ bill.subject }}
      </h3>
      <p class="mb-4 text-sm font-bold text-[#5a5a70]">
        {{ bill.billNumber !== '' ? bill.billNumber : `${bill.term}屆，尚未編號` }}
      </p>
      <div class="flex flex-wrap gap-2 mb-3">
        <span
          class="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-black text-white"
        >
          {{ bill.billType }}
        </span>
        <span class="inline-flex items-center text-xs font-bold text-[#5a5a70]">
          {{ bill.submittedAt }}
        </span>
      </div>
      <div class="text-sm font-semibold leading-relaxed text-[#12122b]">
        <p v-if="bill.proposingEntity === '本會議員'">
          <strong>提案者：</strong>本會{{ bill.proposerName }}議員
        </p>
        <p v-else-if="bill.proposingEntity === '本會議長'">
          <strong>提案者：</strong>本會{{ bill.proposerName }}議長
        </p>
        <p v-else><strong>提案者：</strong>{{ bill.proposingEntity }}</p>
      </div>
      <div class="mt-1 text-sm font-semibold text-[#12122b]">
        <p v-if="bill.scheduledSession"><strong>排入會議：</strong>{{ bill.scheduledSession }}</p>
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
</script>
