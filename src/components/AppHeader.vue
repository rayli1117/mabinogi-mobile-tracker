<script setup>
import { useTaskManager } from '../composables/useTaskManager'
import { openOverlayWindow } from '../composables/useOverlayWindow'
import CharacterBar from './CharacterBar.vue'
import CountdownTimer from './CountdownTimer.vue'

const {
  lastDate,
  lastWeekKey,
  showDashboard,
  showImportExport,
  editMode,
  loadPresetTemplates,
  resetDaily,
  resetWeekly,
} = useTaskManager()
</script>

<template>
  <header class="bg-slate-800/90 p-3 rounded-xl border border-slate-700 shadow-md space-y-3">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-amber-400">瑪奇 Mobile 任務助手</h1>
        <p class="text-xs text-slate-400 mt-0.5">
          目前遊戲日: {{ lastDate }} | 目前週次: {{ lastWeekKey }}
        </p>
      </div>
      <div class="flex flex-col items-stretch sm:items-end gap-1.5">
        <div class="flex flex-wrap gap-1.5">
          <button
            @click="editMode = !editMode"
            class="px-2.5 py-1.5 text-xs rounded border transition font-semibold"
            :class="
              editMode
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                : 'bg-slate-900 hover:bg-slate-700 text-slate-300 border-slate-600'
            "
          >
            {{ editMode ? '✓ 完成編輯' : '✎ 編輯模式' }}
          </button>
          <button
            @click="loadPresetTemplates"
            class="px-2.5 py-1.5 bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 text-xs rounded border border-indigo-500/50 transition"
          >
            ✨ 恢復預設
          </button>
          <button
            @click="showImportExport = true"
            class="px-2.5 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-xs rounded border border-amber-500/50 transition"
          >
            📋 匯出/匯入
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            @click="openOverlayWindow"
            class="px-2.5 py-1.5 bg-emerald-600/40 hover:bg-emerald-600/60 text-emerald-200 text-xs rounded border border-emerald-500/50 transition font-semibold"
            title="開啟精簡浮動清單視窗"
          >
            🪟 Overlay
          </button>
          <button
            @click="showDashboard = true"
            class="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded shadow transition flex items-center gap-1"
          >
            📊 進度總覽
          </button>
          <button
            @click="resetDaily"
            class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-600 transition"
          >
            重置每日
          </button>
          <button
            @click="resetWeekly"
            class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-600 transition"
          >
            重置每週
          </button>
        </div>
      </div>
    </div>

    <CharacterBar />
    <CountdownTimer />
  </header>
</template>
