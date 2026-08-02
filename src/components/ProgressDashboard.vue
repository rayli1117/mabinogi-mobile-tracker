<script setup>
import { useTaskManager } from '../composables/useTaskManager'

const {
  showDashboard,
  characterProgressOverview,
  activeCharId,
  switchCharacterFromDashboard,
} = useTaskManager()
</script>

<template>
  <transition name="fade">
    <div
      v-if="showDashboard"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div class="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-700 pb-3">
          <h3 class="text-lg font-bold text-amber-400 flex items-center gap-2">
            <span>📊</span>
            <span>角色進度總覽面板</span>
          </h3>
          <button @click="showDashboard = false" class="text-slate-400 hover:text-slate-100 text-lg p-1">
            ✕
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="overview in characterProgressOverview"
            :key="overview.id"
            class="bg-slate-900/80 p-3.5 rounded-xl border transition"
            :class="overview.id === activeCharId ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-slate-700/70'"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-sm flex items-center gap-1.5 text-slate-200">
                <span>👤</span>
                <span>{{ overview.name }}</span>
                <span
                  v-if="overview.id === activeCharId"
                  class="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 ml-1"
                >
                  當前
                </span>
              </span>

              <button
                v-if="overview.id !== activeCharId"
                @click="switchCharacterFromDashboard(overview.id)"
                class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-600 transition"
              >
                切換至此角色
              </button>
            </div>

            <div class="space-y-1 mb-2">
              <div class="flex justify-between text-xs text-slate-400 font-mono">
                <span>📅 每日任務: {{ overview.dailyDone }}/{{ overview.dailyTotal }}</span>
                <span
                  class="font-bold"
                  :class="overview.dailyPercent === 100 ? 'text-amber-400' : 'text-emerald-400'"
                >
                  {{ overview.dailyPercent }}%
                </span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
                <div
                  class="h-full transition-all duration-300"
                  :class="overview.dailyPercent === 100 ? 'bg-amber-400' : 'bg-emerald-500'"
                  :style="{ width: overview.dailyPercent + '%' }"
                ></div>
              </div>
            </div>

            <div class="space-y-1">
              <div class="flex justify-between text-xs text-slate-400 font-mono">
                <span>🗓️ 每週任務: {{ overview.weeklyDone }}/{{ overview.weeklyTotal }}</span>
                <span
                  class="font-bold"
                  :class="overview.weeklyPercent === 100 ? 'text-amber-400' : 'text-sky-400'"
                >
                  {{ overview.weeklyPercent }}%
                </span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
                <div
                  class="h-full transition-all duration-300"
                  :class="overview.weeklyPercent === 100 ? 'bg-amber-400' : 'bg-sky-500'"
                  :style="{ width: overview.weeklyPercent + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="text-right pt-2 border-t border-slate-700">
          <button
            @click="showDashboard = false"
            class="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition font-medium"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
