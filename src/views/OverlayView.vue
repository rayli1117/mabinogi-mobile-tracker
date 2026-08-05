<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useTaskManager } from '../composables/useTaskManager'
import { useClickThrough } from '../composables/useClickThrough'
import { useOverlayHotkeys } from '../composables/useOverlayHotkeys'
import { focusMainWindow, isRunningInTauri } from '../composables/useOverlayWindow'
import OverlayTaskRow from '../components/OverlayTaskRow.vue'

const {
  characters,
  activeCharId,
  switchCharacter,
  currentDailyTasks,
  currentWeeklyTasks,
  dailyDoneCount,
  weeklyDoneCount,
  toggleTask,
  incrementCount,
} = useTaskManager()

const { isTauri, clickThrough, toggleClickThrough } = useClickThrough()
const inTauri = ref(false)

const incompleteDaily = computed(() => currentDailyTasks.value.filter((t) => !t.done))
const incompleteWeekly = computed(() => currentWeeklyTasks.value.filter((t) => !t.done))
const incompleteOrdered = computed(() => [...incompleteDaily.value, ...incompleteWeekly.value])

const { lastHotkeyMessage } = useOverlayHotkeys(incompleteOrdered, {
  toggleTask,
  incrementCount,
})

const dailyTotal = computed(() => currentDailyTasks.value.length)
const weeklyTotal = computed(() => currentWeeklyTasks.value.length)

function hotkeyIndexFor(section, indexInSection) {
  const offset = section === 'weekly' ? incompleteDaily.value.length : 0
  const n = offset + indexInSection + 1
  return n <= 9 ? n : 0
}

async function onFullTrackerClick() {
  if (inTauri.value) {
    await focusMainWindow()
    return
  }
}

onMounted(async () => {
  document.body.classList.add('overlay-mode')
  inTauri.value = await isRunningInTauri()
  if (inTauri.value) {
    document.body.classList.add('overlay-tauri')
    document.documentElement.classList.add('overlay-tauri')
  }
})

onUnmounted(() => {
  document.body.classList.remove('overlay-mode', 'overlay-tauri')
  document.documentElement.classList.remove('overlay-tauri')
})
</script>

<template>
  <div
    class="overlay-root flex flex-col min-h-screen max-w-md mx-auto"
    :class="clickThrough ? 'overlay-click-through' : ''"
  >
    <header
      class="sticky top-0 z-10 bg-slate-900/95 border-b border-slate-700 px-3 py-2 space-y-2 backdrop-blur-sm"
      data-tauri-drag-region
    >
      <div class="flex items-center justify-between gap-2" data-tauri-drag-region>
        <h1 class="text-base font-bold text-amber-400 truncate" data-tauri-drag-region>
          任務 Overlay
        </h1>
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            v-if="isTauri"
            type="button"
            class="text-[11px] px-2 py-1 rounded border font-semibold transition"
            :class="
              clickThrough
                ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                : 'bg-emerald-600/30 border-emerald-500/50 text-emerald-200'
            "
            :title="clickThrough ? '目前點擊穿透（F8 關閉）' : '可操作（F8 開啟穿透）'"
            @click="toggleClickThrough"
          >
            {{ clickThrough ? '穿透中 F8' : '可操作 F8' }}
          </button>
          <button
            v-if="inTauri"
            type="button"
            class="text-[11px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
            @click="onFullTrackerClick"
          >
            完整版
          </button>
          <RouterLink
            v-else
            to="/"
            class="text-[11px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            完整版
          </RouterLink>
        </div>
      </div>

      <div class="flex gap-2 text-[11px] font-mono flex-wrap items-center">
        <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">
          每日 {{ dailyDoneCount }}/{{ dailyTotal }}
        </span>
        <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400">
          每週 {{ weeklyDoneCount }}/{{ weeklyTotal }}
        </span>
        <span class="text-slate-500">Ctrl+1~9 完成／+1</span>
      </div>

      <p
        v-if="lastHotkeyMessage"
        class="text-[11px] text-amber-300 font-medium truncate px-0.5"
      >
        {{ lastHotkeyMessage }}
      </p>

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
            v-for="(task, index) in incompleteDaily"
            :key="`daily-${task.scope || 'character'}-${task.id}`"
            :task="task"
            accent="emerald"
            :hotkey-index="hotkeyIndexFor('daily', index)"
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
            v-for="(task, index) in incompleteWeekly"
            :key="`weekly-${task.scope || 'character'}-${task.id}`"
            :task="task"
            accent="sky"
            :hotkey-index="hotkeyIndexFor('weekly', index)"
          />
        </ul>
      </section>
    </main>
  </div>
</template>
