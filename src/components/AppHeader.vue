<script setup>
import { useTaskManager } from '../composables/useTaskManager'

const {
  lastDate,
  lastWeekKey,
  showDashboard,
  loadPresetTemplates,
  exportData,
  triggerFileInput,
  importData,
  fileInput,
  resetDaily,
  resetWeekly,
} = useTaskManager()
</script>

<template>
  <header class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-700 pb-4">
    <div>
      <h1 class="text-2xl font-bold text-amber-400">瑪奇 Mobile 任務助手</h1>
      <p class="text-xs text-slate-400 mt-1">
        上次每日重置: {{ lastDate }} | 上次每週重置: {{ lastWeekKey }}
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        @click="showDashboard = true"
        class="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded shadow transition flex items-center gap-1"
      >
        📊 進度總覽
      </button>

      <button
        @click="loadPresetTemplates"
        class="px-2.5 py-1.5 bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 text-xs rounded border border-indigo-500/50 transition"
      >
        ✨ 載入範本
      </button>

      <button
        @click="exportData"
        class="px-2.5 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-xs rounded border border-amber-500/50 transition"
      >
        📤 匯出 JSON
      </button>
      <button
        @click="triggerFileInput"
        class="px-2.5 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-xs rounded border border-amber-500/50 transition"
      >
        📥 匯入 JSON
      </button>
      <input
        type="file"
        ref="fileInput"
        @change="importData"
        accept=".json"
        class="hidden"
      />

      <button
        @click="resetDaily"
        class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-600 transition"
      >
        重置每日
      </button>
      <button
        @click="resetWeekly"
        class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-600 transition"
      >
        重置每週
      </button>
    </div>
  </header>
</template>
