<template>
  <div class="app-shell min-h-screen">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
  // 設定全域 meta 標籤
  useHead({
    htmlAttrs: {
      lang: 'zh-Hant-TW',
    },
    title: '政大學生議會議案系統',
    meta: [
      { name: 'description', content: '國立政治大學學生議會議事資訊網站' },
      {
        name: 'keywords',
        content: '國立政治大學,政大,學生自治,學生議會,資訊公開,NCCU',
      },
      { property: 'og:title', content: '政大學生議會議案系統' },
      { property: 'og:description', content: '國立政治大學學生議會議事資訊網站' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  });
</script>

<style>
  :root {
    --sc-navy: #000024;
    --sc-navy-light: #1c1c4a;
    --sc-focus-ring: var(--sc-navy);
    --sc-accent: #e60012;
    --sc-page-bg: #f5f5f7;
    --sc-text: #12122b;
    --sc-line: #dcdce2;
    --sc-surface: #ffffff;
    --sc-radius: 12px;
    --sc-shadow: 0 10px 40px rgba(0, 0, 36, 0.06);
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    color: var(--sc-text);
    background: var(--sc-page-bg);
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    overflow-y: scroll;
  }

  a {
    color: inherit;
  }

  .app-shell {
    background: transparent;
  }

  input,
  select,
  textarea {
    border: 1px solid var(--sc-line);
    border-radius: 8px;
    background: #fff;
    color: var(--sc-text);
    box-shadow: none;
  }

  :where(
    a[href],
    button,
    input,
    select,
    textarea,
    [contenteditable='true'],
    [tabindex='0']
  ):focus-visible {
    outline: 2px solid var(--sc-focus-ring);
    outline-offset: 2px;
  }

  footer {
    --sc-focus-ring: #fff;
  }

  @media (forced-colors: active) {
    :where(
      a[href],
      button,
      input,
      select,
      textarea,
      [contenteditable='true'],
      [tabindex='0']
    ):focus-visible {
      outline-color: Highlight;
    }
  }

  .bill-card {
    position: relative;
    padding: 1.5rem;
    color: var(--sc-text);
    background: var(--sc-surface);
    border: 1px solid var(--sc-line);
    border-top: 4px solid var(--sc-navy);
    border-radius: var(--sc-radius);
    box-shadow: var(--sc-shadow);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .bill-card:hover {
    box-shadow: 0 14px 34px rgba(0, 0, 36, 0.12);
    transform: translateY(-2px);
  }

  .bill-card h3 {
    margin-bottom: 0.5rem;
    color: var(--sc-text);
    font-size: 1.125rem;
    font-weight: 800;
    line-height: 1.45;
  }

  .text-primary {
    color: var(--sc-navy);
  }

  .hover\:text-primary:hover {
    color: var(--sc-accent);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    min-height: 2.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--sc-navy);
    border-radius: 999px;
    font-size: 0.875rem;
    font-weight: 800;
    line-height: 1.2;
    transition:
      background-color 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }

  .btn-primary {
    color: #fff;
    background: var(--sc-navy);
    border-color: var(--sc-navy);
  }

  .btn-primary:hover {
    background: var(--sc-navy-light);
    border-color: var(--sc-navy-light);
  }

  .btn-secondary {
    color: var(--sc-navy);
    background: var(--sc-surface);
    border-color: var(--sc-navy);
  }

  .btn-secondary:hover {
    background: var(--sc-page-bg);
  }

  @media (max-width: 640px) {
    .bill-card {
      padding: 1rem;
    }
  }
</style>
