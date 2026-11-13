<template>
  <span>
    <template v-for="(name, index) in names" :key="index">
      <span class="inline-block whitespace-nowrap"
        >{{ name }}{{ index < names.length - 1 ? '、' : '' }}</span
      ><wbr v-if="index < names.length - 1" />
    </template>
  </span>
</template>

<script setup lang="ts">
  defineProps<{ names: string[] }>();
</script>
