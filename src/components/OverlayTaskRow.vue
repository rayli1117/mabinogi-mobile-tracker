<script setup>
import { useTaskManager } from '../composables/useTaskManager'

defineProps({
  task: {
    type: Object,
    required: true,
  },
  accent: {
    type: String,
    default: 'emerald',
    validator: (v) => ['emerald', 'sky'].includes(v),
  },
  hotkeyIndex: {
    type: Number,
    default: 0,
  },
})

const { getCategoryInfo, toggleTask, incrementCount } = useTaskManager()

const accentBtn = {
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
  sky: 'bg-sky-500 hover:bg-sky-400 text-slate-950',
}
</script>

<template>
  <li
    class="flex items-stretch gap-2 rounded-lg border border-slate-600 bg-slate-700/60 overflow-hidden"
  >
    <button
      v-if="!task.maxCount"
      type="button"
      class="flex-1 flex items-center gap-2 px-3 py-3 text-left min-w-0 active:bg-slate-600/80 transition"
      @click="toggleTask(task)"
    >
      <span
        v-if="hotkeyIndex >= 1 && hotkeyIndex <= 9"
        class="shrink-0 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold font-mono bg-slate-900 border border-slate-500 text-slate-200"
        :title="`Ctrl+${hotkeyIndex}`"
      >
        {{ hotkeyIndex }}
      </span>
      <span v-else class="text-lg shrink-0">⬜</span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-slate-100 truncate">{{ task.title }}</div>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span
            v-if="task.scope === 'account'"
            class="text-[10px] px-1 py-0.5 rounded bg-violet-950/50 border border-violet-500/40 text-violet-300"
          >
            帳號
          </span>
          <span class="text-[10px] text-slate-400 truncate">
            {{ getCategoryInfo(task.category).icon }} {{ getCategoryInfo(task.category).name }}
          </span>
        </div>
      </div>
      <span
        class="shrink-0 px-2.5 py-1.5 rounded text-xs font-bold"
        :class="accentBtn[accent]"
      >
        完成
      </span>
    </button>

    <div v-else class="flex-1 flex items-center gap-2 px-3 py-2.5 min-w-0">
      <span
        v-if="hotkeyIndex >= 1 && hotkeyIndex <= 9"
        class="shrink-0 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold font-mono bg-slate-900 border border-slate-500 text-slate-200"
        :title="`Ctrl+${hotkeyIndex}`"
      >
        {{ hotkeyIndex }}
      </span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-slate-100 truncate">{{ task.title }}</div>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span
            v-if="task.scope === 'account'"
            class="text-[10px] px-1 py-0.5 rounded bg-violet-950/50 border border-violet-500/40 text-violet-300"
          >
            帳號
          </span>
          <span
            class="text-xs font-mono font-semibold"
            :class="accent === 'emerald' ? 'text-amber-400' : 'text-sky-400'"
          >
            {{ task.currentCount || 0 }}/{{ task.maxCount }}
          </span>
        </div>
      </div>
      <button
        type="button"
        class="shrink-0 w-12 h-12 rounded-lg text-xl font-bold active:scale-95 transition"
        :class="accentBtn[accent]"
        title="+1"
        @click="incrementCount(task)"
      >
        +1
      </button>
    </div>
  </li>
</template>
