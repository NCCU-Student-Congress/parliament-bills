<template>
  <NuxtLink :to="`/bill/proposal/${bill.id}`" target="_blank" rel="noopener">
    <div class="bill-card cursor-pointer">
      <h3>
        {{ bill.subject }}
      </h3>
      <p class="mb-4 text-sm font-bold text-[#5a5a70]">
        {{ formatTermLabel(bill.session) }} · {{ bill.committeeName }}
      </p>
      <div class="flex flex-wrap gap-2 mb-3">
        <span
          class="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-black text-white"
        >
          {{ bill.meetingTitle }}
        </span>
        <span class="inline-flex items-center text-xs font-bold text-[#5a5a70]">
          {{ formatDateTime(bill.proposedAt) }}
        </span>
      </div>
      <div class="text-sm font-semibold leading-relaxed text-[#12122b]">
        <p><strong>提案人：</strong>{{ bill.proposerName }}</p>
      </div>
      <div class="mt-1 text-sm font-semibold text-[#12122b]">
        <p v-if="confirmedCosponsors.length">
          <strong>連署人：</strong>{{ confirmedCosponsors.join('、') }}
        </p>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
  import { computed } from 'vue';
  import { formatTermLabel } from '~~/shared/utils/term';

  const props = defineProps({
    bill: {
      type: Object,
      required: true,
    },
  });

  const confirmedCosponsors = computed(() =>
    (props.bill.cosponsors ?? [])
      .filter((cosponsor) => cosponsor.status === 'confirmed')
      .map((cosponsor) => cosponsor.userName)
      .filter(Boolean),
  );

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
