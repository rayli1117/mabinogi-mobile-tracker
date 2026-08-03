<script setup>
import { computed } from 'vue'
import { useTaskManager } from '../composables/useTaskManager'
import TaskItem from './TaskItem.vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (v) => ['daily', 'weekly'].includes(v),
  },
})

const {
  categories,
  dailyFilter,
  weeklyFilter,
  filteredDailyTasks,
  filteredWeeklyTasks,
  currentDailyTasks,
  currentWeeklyTasks,
  dailyDoneCount,
  dailyProgress,
  weeklyDoneCount,
  weeklyProgress,
} = useTaskManager()

const isDaily = computed(() => props.type === 'daily')

const filter = computed({
  get: () => (isDaily.value ? dailyFilter.value : weeklyFilter.value),
  set: (val) => {
    if (isDaily.value) dailyFilter.value = val
    else weeklyFilter.value = val
  },
})

const tasks = computed(() => (isDaily.value ? filteredDailyTasks.value : filteredWeeklyTasks.value))
const totalTasks = computed(() => (isDaily.value ? currentDailyTasks.value : currentWeeklyTasks.value))
const doneCount = computed(() => (isDaily.value ? dailyDoneCount.value : weeklyDoneCount.value))
const progress = computed(() => (isDaily.value ? dailyProgress.value : weeklyProgress.value))

const titleClass = computed(() => (isDaily.value ? 'text-emerald-400' : 'text-sky-400'))
const titleText = computed(() =>
  isDaily.value ? '📅 每日任務' : '🗓️ 每週任務 (週一 06:00 重置)',
)
const emptyText = computed(() =>
  isDaily.value ? '該分類下目前沒有每日任務！' : '該分類下目前沒有每週任務！',
)
const activeFilterClass = computed(() =>
  isDaily.value ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-sky-500 text-slate-950 font-semibold',
)
const progressBarClass = computed(() => {
  if (progress.value === 100) return 'bg-amber-400'
  return isDaily.value ? 'bg-emerald-500' : 'bg-sky-500'
})
</script>

<template>
  <section class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-semibold flex items-center gap-2" :class="titleClass">
        <span>{{ titleText }}</span>
      </h2>
      <span class="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
        {{ doneCount }} / {{ totalTasks.length }} ({{ progress }}%)
      </span>
    </div>

    <div class="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden mb-3 border border-slate-700/50">
      <div
        class="h-full transition-all duration-300 ease-out"
        :class="progressBarClass"
        :style="{ width: progress + '%' }"
      ></div>
    </div>

    <div class="flex flex-wrap gap-1.5 mb-4">
      <button
        @click="filter = 'all'"
        class="px-2.5 py-1 rounded-full text-xs font-medium transition"
        :class="filter === 'all' ? activeFilterClass : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-700'"
      >
        全部
      </button>
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="filter = cat.id"
        class="px-2.5 py-1 rounded-full text-xs font-medium transition flex items-center gap-1"
        :class="filter === cat.id ? activeFilterClass : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-700'"
      >
        <span>{{ cat.icon }}</span>
        <span>{{ cat.name }}</span>
      </button>
    </div>

    <p v-if="tasks.length === 0" class="text-slate-500 text-sm italic py-2">{{ emptyText }}</p>

    <transition-group name="task-list" tag="ul" class="space-y-3 relative">
      <TaskItem
        v-for="task in tasks"
        :key="`${task.scope || 'character'}-${task.id}`"
        :task="task"
        :type="type"
      />
    </transition-group>
  </section>
</template>
