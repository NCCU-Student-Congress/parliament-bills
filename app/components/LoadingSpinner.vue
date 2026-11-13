<template>
  <progress class="loading-spinner" :aria-label="label" />
</template>

<script setup lang="ts">
  withDefaults(defineProps<{ label?: string }>(), { label: '載入中' });
</script>

<style scoped>
  .loading-spinner {
    display: inline-block;
    width: 1.75rem;
    height: 1.75rem;
    border: 3px solid #dcdce2;
    border-top-color: var(--sc-navy);
    border-radius: 50%;
    appearance: none;
    background: transparent;
    animation: loading-spinner-spin 0.8s linear infinite;
  }

  /* Separate rules: a browser drops a whole selector list that names a pseudo-element it lacks. */
  .loading-spinner::-webkit-progress-bar {
    background: transparent;
  }

  .loading-spinner::-webkit-progress-value {
    background: transparent;
  }

  .loading-spinner::-moz-progress-bar {
    background: transparent;
  }

  @keyframes loading-spinner-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-spinner {
      animation-duration: 3s;
    }
  }

  @media (forced-colors: active) {
    .loading-spinner {
      border-color: CanvasText;
      border-top-color: Highlight;
    }
  }
</style>
