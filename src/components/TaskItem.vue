<script setup>
import { ref, nextTick, watch } from 'vue'
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
  editMode,
  getCategoryInfo,
  toggleTask,
  updateTask,
  setTaskNotes,
  incrementCount,
  decrementCount,
  deleteTask,
} = useTaskManager()

const isEditingTitle = ref(false)
const editTitle = ref('')
const titleInput = ref(null)

const isEditingNotes = ref(false)
const editNotes = ref('')
const notesInput = ref(null)

watch(editMode, (on) => {
  if (!on) {
    isEditingTitle.value = false
    isEditingNotes.value = false
  }
})

async function startEditTitle() {
  if (!editMode.value) return
  editTitle.value = props.task.title
  isEditingTitle.value = true
  isEditingNotes.value = false
  await nextTick()
  titleInput.value?.focus()
  titleInput.value?.select()
}

function saveTitle() {
  if (!isEditingTitle.value) return
  updateTask(props.task, { title: editTitle.value })
  isEditingTitle.value = false
}

function cancelEditTitle() {
  isEditingTitle.value = false
  editTitle.value = props.task.title
}

async function startEditNotes() {
  if (!editMode.value) return
  editNotes.value = props.task.notes || ''
  isEditingNotes.value = true
  isEditingTitle.value = false
  await nextTick()
  notesInput.value?.focus()
  notesInput.value?.select()
}

function saveNotes() {
  if (!isEditingNotes.value) return
  setTaskNotes(props.task.id, editNotes.value)
  isEditingNotes.value = false
}

function cancelEditNotes() {
  isEditingNotes.value = false
  editNotes.value = props.task.notes || ''
}

function onRowClick() {
  if (editMode.value) return
  toggleTask(props.task)
}
</script>

<template>
  <li
    class="flex items-center justify-between p-3 rounded-lg border transition-all duration-300 select-none group"
    :class="
      task.done
        ? 'bg-slate-900/50 border-slate-800/80 text-slate-500'
        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
    "
    :title="task.notes || undefined"
  >
    <div
      class="flex-1 flex items-center gap-3 overflow-hidden"
      :class="editMode ? '' : 'cursor-pointer'"
      @click="onRowClick"
    >
      <span class="text-lg transition-transform active:scale-125 shrink-0">{{ task.done ? '✅' : '⬜' }}</span>

      <div class="flex-1 min-w-0 flex flex-col gap-0.5">
        <input
          v-if="isEditingTitle"
          ref="titleInput"
          v-model="editTitle"
          type="text"
          class="w-full min-w-0 bg-slate-900 border border-amber-500/60 rounded px-2 py-0.5 text-sm text-slate-100 focus:outline-none"
          @click.stop
          @keydown.enter.prevent="saveTitle"
          @keydown.escape.prevent="cancelEditTitle"
          @blur="saveTitle"
        />
        <span
          v-else
          class="truncate"
          :class="{ 'line-through': task.done, 'cursor-text': editMode }"
          :title="editMode ? '點擊重新命名' : task.notes || undefined"
          @click.stop="editMode ? startEditTitle() : onRowClick()"
        >
          {{ task.title }}
        </span>

        <input
          v-if="isEditingNotes"
          ref="notesInput"
          v-model="editNotes"
          type="text"
          class="w-full min-w-0 bg-slate-900 border border-amber-500/40 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none"
          placeholder="NPC / 地點備註…"
          @click.stop
          @keydown.enter.prevent="saveNotes"
          @keydown.escape.prevent="cancelEditNotes"
          @blur="saveNotes"
        />
        <span
          v-else-if="task.notes || editMode"
          class="truncate text-[11px] leading-tight"
          :class="
            task.notes
              ? task.done
                ? 'text-slate-600'
                : 'text-slate-400'
              : 'text-slate-600 italic'
          "
          :title="editMode ? '點擊編輯備註' : task.notes || undefined"
          @click.stop="editMode ? startEditNotes() : onRowClick()"
        >
          {{ task.notes || (editMode ? '新增備註…' : '') }}
        </span>
      </div>

      <span
        v-if="task.scope === 'account'"
        class="text-[10px] px-1.5 py-0.5 rounded bg-violet-950/50 border border-violet-500/40 text-violet-300 font-normal shrink-0"
      >
        帳號
      </span>
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
          :title="
            task.weeklyMaxCount
              ? `今日可用 ${task.maxCount}／每週上限 ${task.weeklyMaxCount}`
              : undefined
          "
        >
          <template v-if="task.weeklyMaxCount">
            {{ task.currentCount || 0 }}/{{ task.maxCount }} ({{ task.weeklyMaxCount }})
          </template>
          <template v-else>
            {{ task.currentCount || 0 }}/{{ task.maxCount }}
          </template>
        </span>
        <button
          @click.stop="incrementCount(task)"
          class="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-400 hover:bg-slate-800 rounded transition"
          :class="type === 'daily' ? 'hover:text-amber-400' : 'hover:text-sky-400'"
        >
          +
        </button>
      </div>

      <template v-if="editMode">
        <button
          @click.stop="startEditTitle"
          class="p-1 text-xs rounded transition text-slate-500 hover:text-slate-200 opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
          title="重新命名任務"
        >
          ✎
        </button>

        <button
          @click.stop="startEditNotes"
          class="p-1 text-xs rounded transition text-slate-500 hover:text-slate-200 opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
          title="編輯備註"
        >
          📝
        </button>

        <button
          @click.stop="deleteTask(type, task.id)"
          class="text-slate-500 hover:text-rose-400 p-1 text-sm rounded transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
          title="刪除任務"
        >
          🗑️
        </button>
      </template>
    </div>
  </li>
</template>
