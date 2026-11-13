<template>
  <NuxtLink :to="`/bill/proposal/${bill.id}`">
    <div class="bill-card cursor-pointer">
      <h3>
        {{ bill.subject }}
      </h3>
      <p class="mb-4 text-sm font-bold text-[#5a5a70]">
        {{ formatTermLabel(bill.session) }} · {{ bill.committeeName }}
      </p>
      <ProposalTypePill :proposal-type="bill.proposalType" class="mb-3" />
      <div class="text-sm font-semibold leading-relaxed text-[#12122b]">
        <p><strong>提案人：</strong>{{ bill.proposerName }}</p>
      </div>
      <div class="mt-1 text-sm font-semibold text-[#12122b]">
        <p v-if="confirmedCosponsors.length">
          <strong>連署人：</strong><NameList :names="confirmedCosponsors" />
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
    (props.bill.cosponsors ?? []).map((cosponsor) => cosponsor.userName).filter(Boolean),
  );
</script>
