<template>
  <button class="loading-button" :disabled="disabled || loading" :aria-busy="loading">
    <span class="loading-button-label"><slot /></span>
    <progress v-if="loading" class="loading-button-indicator" :aria-label="loadingLabel" />
  </button>
</template>

<script setup lang="ts">
  withDefaults(
    defineProps<{
      loading?: boolean;
      disabled?: boolean;
      loadingLabel?: string;
    }>(),
    { loading: false, disabled: false, loadingLabel: '處理中' },
  );
</script>

<style scoped>
  .loading-button {
    display: inline-grid;
    grid-template-columns: minmax(1rem, 1fr) max-content minmax(1rem, 1fr);
    align-items: center;
    justify-items: center;
    column-gap: 0.375rem;
  }

  .loading-button-label {
    grid-column: 2;
    white-space: nowrap;
  }

  .loading-button-indicator {
    grid-column: 3;
    width: 1rem;
    height: 1rem;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    appearance: none;
    background: transparent;
    animation: loading-button-spin 0.8s linear infinite;
  }

  .loading-button-indicator::-webkit-progress-bar,
  .loading-button-indicator::-webkit-progress-value,
  .loading-button-indicator::-moz-progress-bar {
    background: transparent;
  }

  @keyframes loading-button-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-button-indicator {
      animation-duration: 3s;
    }
  }

  @media (forced-colors: active) {
    .loading-button-indicator {
      border-color: ButtonText;
      border-right-color: transparent;
    }
  }
</style>
