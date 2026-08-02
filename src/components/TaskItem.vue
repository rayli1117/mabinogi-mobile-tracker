<script setup>
import { useTaskManager } from '../composables/useTaskManager'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  type: {
    type: String,
    required: true,
    validator: (v) => ['daily', 'weekly'].includes(v),
  },
})

const {
  getCategoryInfo,
  toggleTask,
  togglePin,
  incrementCount,
  decrementCount,
  deleteTask,
} = useTaskManager()
</script>

<template>
  <li
    class="flex items-center justify-between p-3 rounded-lg border transition-all duration-300 select-none group"
    :class="[
      task.done ? 'bg-slate-900/50 border-slate-800/80 text-slate-500' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500',
      task.pinned && !task.done
        ? type === 'daily'
          ? 'ring-1 ring-amber-400/60 border-amber-500/50 bg-amber-950/20'
          : 'ring-1 ring-sky-400/60 border-sky-500/50 bg-sky-950/20'
        : '',
    ]"
  >
    <div class="flex-1 flex items-center gap-3 cursor-pointer overflow-hidden" @click="toggleTask(task)">
      <span class="text-lg transition-transform active:scale-125 shrink-0">{{ task.done ? '✅' : '⬜' }}</span>
      <span v-if="task.pinned" class="text-xs shrink-0" title="重點釘選">📌</span>
      <span class="truncate" :class="{ 'line-through': task.done }">{{ task.title }}</span>
      <span class="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700/70 text-slate-400 font-normal shrink-0 hidden sm:inline-block">
        {{ getCategoryInfo(task.category).icon }} {{ getCategoryInfo(task.category).name }}
      </span>
    </div>

    <div class="flex items-center gap-2 ml-2 shrink-0">
      <div
        v-if="task.maxCount"
        class="flex items-center bg-slate-900 rounded border border-slate-700/80 px-1 py-0.5"
      >
        <button
          @click.stop="decrementCount(task)"
          class="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-400 hover:bg-slate-800 rounded transition"
          :class="type === 'daily' ? 'hover:text-amber-400' : 'hover:text-sky-400'"
        >
          -
        </button>
        <span
          class="text-xs font-mono px-1.5 font-semibold"
          :class="task.done ? 'text-slate-500' : type === 'daily' ? 'text-amber-400' : 'text-sky-400'"
        >
          {{ task.currentCount || 0 }}/{{ task.maxCount }}
        </span>
        <button
          @click.stop="incrementCount(task)"
          class="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-400 hover:bg-slate-800 rounded transition"
          :class="type === 'daily' ? 'hover:text-amber-400' : 'hover:text-sky-400'"
        >
          +
        </button>
      </div>

      <button
        @click.stop="togglePin(task)"
        class="p-1 text-xs rounded transition"
        :class="
          task.pinned
            ? type === 'daily'
              ? 'text-amber-400 font-bold'
              : 'text-sky-400 font-bold'
            : 'text-slate-500 hover:text-slate-300 opacity-60 sm:opacity-0 sm:group-hover:opacity-100'
        "
        :title="task.pinned ? '取消釘選' : '釘選置頂'"
      >
        {{ task.pinned ? '📌' : '📍' }}
      </button>

      <button
        @click.stop="deleteTask(type, task.id)"
        class="text-slate-500 hover:text-rose-400 p-1 text-sm rounded transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
        title="刪除任務"
      >
        🗑️
      </button>
    </div>
  </li>
</template>
