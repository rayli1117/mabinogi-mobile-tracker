<script setup>
import { useTaskManager } from '../composables/useTaskManager'

const {
  categories,
  editMode,
  newTaskTitle,
  newTaskCategory,
  newTaskType,
  newTaskScope,
  hasCountLimit,
  maxCountInput,
  addTask,
} = useTaskManager()
</script>

<template>
  <section
    v-if="editMode"
    class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg space-y-3"
  >
    <h3 class="text-sm font-semibold text-slate-300">
      ➕
      {{
        newTaskScope === 'account'
          ? '為【帳號共用】新增任務'
          : '為【所有角色】新增任務'
      }}
    </h3>
    <div class="flex flex-col gap-2">
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="newTaskTitle"
          @keyup.enter="addTask"
          type="text"
          placeholder="輸入任務名稱 (例: 每日地下城討伐)..."
          class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 transition"
        />
        <select
          v-model="newTaskScope"
          class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 text-slate-300"
        >
          <option value="character">👤 角色</option>
          <option value="account">🌐 帳號</option>
        </select>
        <select
          v-model="newTaskCategory"
          class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 text-slate-300"
        >
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.icon }} {{ cat.name }}
          </option>
        </select>
        <select
          v-model="newTaskType"
          class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 text-slate-300"
        >
          <option value="daily">📅 每日任務</option>
          <option value="weekly">🗓️ 每週任務</option>
        </select>
      </div>

      <div class="flex flex-wrap items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-700/60 text-xs gap-2">
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
            <input
              type="checkbox"
              v-model="hasCountLimit"
              class="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
            />
            <span>設定目標次數</span>
          </label>

          <div v-if="hasCountLimit" class="flex items-center gap-1.5">
            <span class="text-slate-400">次數:</span>
            <input
              v-model.number="maxCountInput"
              type="number"
              min="1"
              max="99"
              class="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-center text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <button
          @click="addTask"
          class="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-4 py-1.5 rounded-lg text-xs transition ml-auto"
        >
          新增
        </button>
      </div>
    </div>
  </section>
</template>
