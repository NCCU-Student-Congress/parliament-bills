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
      <p class="mb-2 text-base font-black leading-relaxed text-[#12122b]">
        {{ bill.subject }}
      </p>
      <p class="mb-4 text-sm font-bold text-[#5a5a70]">
        {{
          bill.billNumber !== ''
            ? '第' + bill.billNumber.replace(/北大峽議字/, '')
            : '（本件秘書處尚未編號）'
        }}
      </p>
      <div class="text-sm font-semibold leading-relaxed text-[#12122b]">
        <p v-if="bill.proposingEntity === '本會議員'">
          <strong>提案者：</strong>本會{{ bill.proposerName }}議員
        </p>
        <p v-else-if="bill.proposingEntity === '本會議長'">
          <strong>提案者：</strong>本會{{ bill.proposerName }}議長
        </p>
        <p v-else><strong>提案者：</strong>{{ bill.proposingEntity }}</p>
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
