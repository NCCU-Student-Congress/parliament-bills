<template>
  <footer class="border-t border-primary bg-primary text-white print:hidden">
    <div class="mx-auto max-w-7xl px-4 py-8">
      <div class="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <!-- 組織資訊 -->
        <div>
          <h3 class="mb-1 text-lg font-black">國立政治大學學生議會</h3>
          <p class="text-sm font-bold text-white/90">NCCU STUDENT CONGRESS</p>
        </div>

        <!-- 社群媒體連結與版權資訊 -->
        <div class="flex flex-col items-start gap-2 md:items-end">
          <!-- 未來社群媒體連結放置於此 -->
          <p class="text-sm text-white/70">© {{ currentYear }} 國立政治大學學生議會秘書處</p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
  const currentYear = new Date().getFullYear();
</script>
