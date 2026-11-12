<template>
  <span
    class="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-black text-white"
  >
    {{ proposalTypeLabels[proposalType] }}
  </span>
</template>

<script setup lang="ts">
  import type { ProposalType } from '~~/shared/types/bill';
  import { proposalTypeLabels } from '~~/shared/types/bill';

  defineProps<{ proposalType: ProposalType }>();
</script>
