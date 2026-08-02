<script setup>
import { useTaskManager } from '../composables/useTaskManager'

const {
  characters,
  activeCharId,
  switchCharacter,
  addNewCharacter,
  deleteCurrentCharacter,
} = useTaskManager()
</script>

<template>
  <section class="bg-slate-800/90 p-3 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-md">
    <div class="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none flex-1">
      <span class="text-xs font-semibold text-slate-400 shrink-0">🎭 角色:</span>
      <button
        v-for="char in characters"
        :key="char.id"
        @click="switchCharacter(char.id)"
        class="px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0"
        :class="activeCharId === char.id ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-700 border border-slate-700'"
      >
        <span>👤</span>
        <span>{{ char.name }}</span>
      </button>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <button
        @click="addNewCharacter"
        class="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs rounded border border-emerald-500/50 transition"
      >
        ➕ 新增分身
      </button>
      <button
        v-if="characters.length > 1"
        @click="deleteCurrentCharacter"
        class="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 text-xs rounded border border-rose-500/40 transition"
        title="刪除當前角色"
      >
        🗑️ 刪除此角色
      </button>
    </div>
  </section>
</template>
