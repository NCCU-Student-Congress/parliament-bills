<template>
  <div
    class="bill-filter mb-6 rounded-xl border border-[#dcdce2] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,36,0.05)]"
  >
    <h3
      class="mb-4 flex cursor-pointer select-none items-center text-lg font-black text-[#12122b]"
      @click="isCollapsed = !isCollapsed"
    >
      <span class="mr-2">篩選議案</span>
      <svg
        :class="['transition-transform', isCollapsed ? 'rotate-0' : 'rotate-180']"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </h3>
    <div v-show="!isCollapsed">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div class="filter-group">
          <label class="filter-label"> 關鍵字 </label>
          <input
            v-model="localFilters.keyword"
            type="text"
            class="filter-control"
            placeholder="搜尋案由、說明、提案人"
          />
        </div>

        <div class="filter-group">
          <label class="filter-label"> 委員會 </label>
          <select v-model="localFilters.committeeId" class="filter-control">
            <option value="">全部委員會</option>
            <option
              v-for="committee in committees"
              :key="committee.id"
              :value="String(committee.id)"
            >
              {{ committee.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label"> 提案人 </label>
          <input
            v-model="localFilters.proposer"
            type="text"
            class="filter-control"
            placeholder="請輸入提案人姓名"
          />
        </div>

        <div class="filter-group">
          <label class="filter-label"> 排入會議 </label>
          <input
            v-model="localFilters.meeting"
            type="text"
            class="filter-control"
            placeholder="請輸入會議關鍵字"
          />
        </div>

        <div class="filter-group">
          <label class="filter-label"> 提案日期起 </label>
          <input v-model="localFilters.dateFrom" type="date" class="filter-control" />
        </div>

        <div class="filter-group">
          <label class="filter-label"> 提案日期迄 </label>
          <input v-model="localFilters.dateTo" type="date" class="filter-control" />
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="mt-6 flex justify-end space-x-3">
        <button @click="clearFilters" class="btn btn-secondary">清除篩選</button>
        <button @click="applyFilters" class="btn btn-primary">套用篩選</button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue';

  const props = defineProps({
    filters: {
      type: Object,
      default: () => ({}),
    },
    committees: {
      type: Array,
      default: () => [],
    },
  });

  const emit = defineEmits(['update:filters']);

  const localFilters = ref({
    keyword: '',
    committeeId: '',
    proposer: '',
    meeting: '',
    dateFrom: '',
    dateTo: '',
    ...props.filters,
  });

  // 監聽父組件傳入的篩選條件變化
  watch(
    () => props.filters,
    (newFilters) => {
      localFilters.value = { ...localFilters.value, ...newFilters };
    },
    { deep: true },
  );

  const applyFilters = () => {
    // 過濾掉空值
    const activeFilters = Object.entries(localFilters.value)
      .filter(([key, value]) => value !== '' && value !== null && value !== undefined)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    emit('update:filters', activeFilters);
  };

  const clearFilters = () => {
    localFilters.value = {
      keyword: '',
      committeeId: '',
      proposer: '',
      meeting: '',
      dateFrom: '',
      dateTo: '',
    };
    emit('update:filters', {});
  };

  const isCollapsed = ref(true);

  // 實時篩選（可選，如果需要即時篩選效果）
  // watch(localFilters, () => {
  //   applyFilters()
  // }, { deep: true })
</script>

<style scoped>
  .filter-group {
    display: flex;
    flex-direction: column;
  }

  .filter-label {
    margin-bottom: 0.5rem;
    color: #12122b;
    font-size: 0.875rem;
    font-weight: 900;
  }

  .filter-control {
    width: 100%;
    border: 1px solid #dcdce2;
    border-radius: 8px;
    background: #fff;
    padding: 0.55rem 0.75rem;
    color: #12122b;
    font-size: 0.925rem;
    font-weight: 650;
  }

  .filter-control::placeholder {
    color: #5a5a70;
  }

  .filter-control:focus {
    border-color: #e60012;
    outline: 3px solid rgba(230, 0, 18, 0.18);
  }
</style>
