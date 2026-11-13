<template>
  <span v-if="parts.prefix" class="agenda-hanging-text">
    <span>{{ parts.prefix }}</span>
    <span>{{ parts.content }}</span>
  </span>
  <span v-else>{{ text }}</span>
</template>

<script setup lang="ts">
  import { splitAgendaNumberedText } from '~~/shared/utils/agenda';

  const props = defineProps<{ text: string }>();
  const parts = computed(() => splitAgendaNumberedText(props.text));
</script>

<style scoped>
  .agenda-hanging-text {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
  }
</style>
