<script setup>
import { useTaskManager } from '../composables/useTaskManager'

const { dailyCountdownText, weeklyCountdownText } = useTaskManager()
</script>

<template>
  <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-700/70">
    <div class="flex items-center gap-2 text-xs bg-slate-900/70 border border-amber-500/30 rounded-lg px-2.5 py-1.5 grow sm:grow-0">
      <span class="text-amber-400 shrink-0">⏳</span>
      <span class="text-slate-400 font-medium shrink-0">每日重置</span>
      <span class="font-mono font-bold text-amber-400 tracking-wider ml-auto sm:ml-1">
        {{ dailyCountdownText }}
      </span>
    </div>

    <div class="flex items-center gap-2 text-xs bg-slate-900/70 border border-sky-500/30 rounded-lg px-2.5 py-1.5 grow sm:grow-0">
      <span class="text-sky-400 shrink-0">🗓️</span>
      <span class="text-slate-400 font-medium shrink-0">每週重置</span>
      <span class="font-mono font-bold text-sky-400 tracking-wider ml-auto sm:ml-1">
        {{ weeklyCountdownText }}
      </span>
    </div>
  </div>
</template>
