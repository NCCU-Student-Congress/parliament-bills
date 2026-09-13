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
    title: '北大三峽議事資訊網',
    meta: [
      { name: 'description', content: '國立臺北大學三峽校區學生議會議事資訊網站' },
      {
        name: 'keywords',
        content: '國立臺北大學,臺北大學,學生自治,三峽校區,學生議會,資訊公開,NTPU',
      },
      { property: 'og:title', content: '北大三峽議事資訊網' },
      { property: 'og:description', content: '國立臺北大學三峽校區學生議會議事資訊網站' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  });
</script>

<style>
  :root {
    --sc-navy: #000024;
    --sc-navy-dark: #000018;
    --sc-navy-light: #1c1c4a;
    --sc-accent: #e60012;
    --sc-accent-light: #ff4d5a;
    --sc-page-bg: #f5f5f7;
    --sc-text: #12122b;
    --sc-text-muted: #5a5a70;
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

  .responsive-table,
  .overflow-x-auto {
    scrollbar-color: var(--sc-navy) var(--sc-line);
  }

  .responsive-table {
    overflow-x: auto;
  }

  .responsive-table table {
    min-width: 100%;
    border: 1px solid var(--sc-line);
    border-top: 3px solid var(--sc-navy);
    background: var(--sc-surface);
    border-collapse: collapse;
  }

  .responsive-table th {
    padding: 0.75rem 1.5rem;
    text-align: left;
    color: var(--sc-text);
    background: var(--sc-page-bg);
    border-bottom: 1px solid var(--sc-line);
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .responsive-table td {
    padding: 1rem 1.5rem;
    color: var(--sc-text);
    border-bottom: 1px solid var(--sc-line);
    font-size: 0.875rem;
    white-space: nowrap;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }

  .pagination button {
    padding: 0.5rem 0.75rem;
    color: var(--sc-text);
    background: var(--sc-surface);
    border: 1px solid var(--sc-line);
    border-radius: 999px;
    font-size: 0.875rem;
    font-weight: 700;
  }

  .pagination button.active {
    color: #fff;
    background: var(--sc-navy);
    border-color: var(--sc-navy);
  }

  .pagination button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .filter-form {
    padding: 1.5rem;
    background: var(--sc-surface);
    border: 1px solid var(--sc-line);
    border-radius: var(--sc-radius);
  }

  .filter-form label {
    display: block;
    color: var(--sc-text);
    font-size: 0.875rem;
    font-weight: 800;
  }

  .filter-form input,
  .filter-form select,
  input,
  select,
  textarea {
    border: 1px solid var(--sc-line);
    border-radius: 8px;
    background: #fff;
    color: var(--sc-text);
    box-shadow: none;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: var(--sc-accent);
    outline: 3px solid rgba(230, 0, 18, 0.18);
    outline-offset: 0;
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

  .bill-card .bill-number {
    color: var(--sc-text-muted);
    font-size: 0.875rem;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    color: var(--sc-text-muted);
    font-size: 0.875rem;
  }

  .breadcrumb a,
  .text-primary {
    color: var(--sc-navy);
  }

  .breadcrumb a:hover,
  .hover\:text-primary:hover {
    color: var(--sc-accent);
  }

  .breadcrumb span {
    color: var(--sc-text-muted);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--sc-line);
    border-top-color: var(--sc-accent);
    border-radius: 9999px;
    animation: spin 1s linear infinite;
  }

  .error-message {
    padding: 0.75rem 1rem;
    color: #7f1d1d;
    background: #fef2f2;
    border: 2px solid #991b1b;
  }

  .success-message {
    padding: 0.75rem 1rem;
    color: #14532d;
    background: #f0fdf4;
    border: 2px solid #15803d;
  }

  .empty-state {
    padding-block: 3rem;
    text-align: center;
  }

  .empty-state h3 {
    margin-bottom: 0.5rem;
    color: var(--sc-text);
    font-size: 1.125rem;
    font-weight: 800;
  }

  .empty-state p {
    color: var(--sc-text-muted);
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

  .btn-sm {
    min-height: 2rem;
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  .btn-lg {
    min-height: 3rem;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  .card {
    background: var(--sc-surface);
    border: 1px solid var(--sc-line);
    border-radius: var(--sc-radius);
    box-shadow: var(--sc-shadow);
  }

  .card-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--sc-line);
  }

  .card-body {
    padding: 1.5rem;
  }

  .card-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--sc-line);
  }

  @media (max-width: 640px) {
    .responsive-table {
      font-size: 0.875rem;
    }

    .responsive-table th,
    .responsive-table td {
      padding: 0.5rem 0.75rem;
    }

    .bill-card {
      padding: 1rem;
    }

    .filter-form {
      padding: 1rem;
    }
  }
</style>
