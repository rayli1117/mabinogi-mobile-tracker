<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useTaskManager } from '../composables/useTaskManager'
import OverlayTaskRow from '../components/OverlayTaskRow.vue'

const {
  characters,
  activeCharId,
  switchCharacter,
  currentDailyTasks,
  currentWeeklyTasks,
  dailyDoneCount,
  weeklyDoneCount,
} = useTaskManager()

const incompleteDaily = computed(() => currentDailyTasks.value.filter((t) => !t.done))
const incompleteWeekly = computed(() => currentWeeklyTasks.value.filter((t) => !t.done))

const dailyTotal = computed(() => currentDailyTasks.value.length)
const weeklyTotal = computed(() => currentWeeklyTasks.value.length)

onMounted(() => {
  document.body.classList.add('overlay-mode')
})

onUnmounted(() => {
  document.body.classList.remove('overlay-mode')
})
</script>

<template>
  <div class="overlay-root flex flex-col min-h-screen max-w-md mx-auto">
    <header class="sticky top-0 z-10 bg-slate-900/95 border-b border-slate-700 px-3 py-2 space-y-2 backdrop-blur-sm">
      <div class="flex items-center justify-between gap-2">
        <h1 class="text-base font-bold text-amber-400 truncate">任務 Overlay</h1>
        <RouterLink
          to="/"
          class="text-[11px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 shrink-0"
        >
          完整版
        </RouterLink>
      </div>

      <div class="flex gap-2 text-[11px] font-mono">
        <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">
          每日 {{ dailyDoneCount }}/{{ dailyTotal }}
        </span>
        <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400">
          每週 {{ weeklyDoneCount }}/{{ weeklyTotal }}
        </span>
      </div>

      <div class="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
        <span class="text-[10px] font-semibold text-slate-500 shrink-0">角色</span>
        <button
          v-for="char in characters"
          :key="char.id"
          type="button"
          class="px-2.5 py-1 rounded-md text-[11px] font-medium transition shrink-0"
          :class="
            activeCharId === char.id
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
          "
          @click="switchCharacter(char.id)"
        >
          {{ char.name }}
        </button>
      </div>
    </header>

    <main class="flex-1 px-3 py-3 space-y-4">
      <section>
        <h2 class="text-xs font-semibold text-emerald-400 mb-2">每日 · 未完成</h2>
        <p v-if="incompleteDaily.length === 0" class="text-slate-500 text-xs italic py-1">
          全部完成！
        </p>
        <ul v-else class="space-y-2">
          <OverlayTaskRow
            v-for="task in incompleteDaily"
            :key="`daily-${task.scope || 'character'}-${task.id}`"
            :task="task"
            accent="emerald"
          />
        </ul>
      </section>

      <section>
        <h2 class="text-xs font-semibold text-sky-400 mb-2">每週 · 未完成</h2>
        <p v-if="incompleteWeekly.length === 0" class="text-slate-500 text-xs italic py-1">
          全部完成！
        </p>
        <ul v-else class="space-y-2">
          <OverlayTaskRow
            v-for="task in incompleteWeekly"
            :key="`weekly-${task.scope || 'character'}-${task.id}`"
            :task="task"
            accent="sky"
          />
        </ul>
      </section>
    </main>
  </div>
</template>
