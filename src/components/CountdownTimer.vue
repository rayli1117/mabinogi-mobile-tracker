<script setup>
import { useTaskManager } from '../composables/useTaskManager'

const { dailyCountdownText, weeklyCountdownText } = useTaskManager()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <section class="bg-slate-800/80 border border-amber-500/30 p-3 rounded-xl shadow-md flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
        <span class="text-amber-400 text-base">⏳</span>
        <span class="font-medium">距離每日重置 (06:00)：</span>
      </div>
      <div class="font-mono font-bold text-amber-400 text-xs sm:text-sm tracking-wider bg-slate-900 px-2.5 py-1 rounded border border-amber-500/20">
        {{ dailyCountdownText }}
      </div>
    </section>

    <section class="bg-slate-800/80 border border-sky-500/30 p-3 rounded-xl shadow-md flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
        <span class="text-sky-400 text-base">🗓️</span>
        <span class="font-medium">距離每週重置 (週一 06:00)：</span>
      </div>
      <div class="font-mono font-bold text-sky-400 text-xs sm:text-sm tracking-wider bg-slate-900 px-2.5 py-1 rounded border border-sky-500/20">
        {{ weeklyCountdownText }}
      </div>
    </section>
  </div>
</template>
