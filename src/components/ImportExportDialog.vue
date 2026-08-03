<script setup>
import { ref, watch } from 'vue'
import { useTaskManager } from '../composables/useTaskManager'

const { showImportExport, getExportText, importFromText } = useTaskManager()

const text = ref('')
const textareaRef = ref(null)

watch(showImportExport, (open) => {
  if (open) text.value = getExportText()
})

async function copyText() {
  const value = text.value
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    } else if (textareaRef.value) {
      textareaRef.value.focus()
      textareaRef.value.select()
      document.execCommand('copy')
    } else {
      throw new Error('Clipboard unavailable')
    }
    alert('✅ 已複製到剪貼簿！')
  } catch {
    alert('❌ 複製失敗，請手動選取文字複製。')
  }
}

function handleImport() {
  if (importFromText(text.value)) {
    showImportExport.value = false
  }
}

function close() {
  showImportExport.value = false
}
</script>

<template>
  <transition name="fade">
    <div
      v-if="showImportExport"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="close"
    >
      <div class="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-700 pb-3">
          <h3 class="text-lg font-bold text-amber-400 flex items-center gap-2">
            <span>📋</span>
            <span>匯出 / 匯入</span>
          </h3>
          <button @click="close" class="text-slate-400 hover:text-slate-100 text-lg p-1">
            ✕
          </button>
        </div>

        <p class="text-xs text-slate-400">
          複製下方文字即可備份；貼上備份文字後按「匯入」還原。
        </p>

        <textarea
          ref="textareaRef"
          v-model="text"
          rows="14"
          spellcheck="false"
          class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        />

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-700">
          <button
            @click="close"
            class="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition font-medium"
          >
            關閉
          </button>
          <button
            @click="copyText"
            class="px-4 py-1.5 bg-amber-600/40 hover:bg-amber-600/60 text-amber-200 text-xs rounded-lg border border-amber-500/50 transition font-medium"
          >
            複製
          </button>
          <button
            @click="handleImport"
            class="px-4 py-1.5 bg-emerald-600/40 hover:bg-emerald-600/60 text-emerald-200 text-xs rounded-lg border border-emerald-500/50 transition font-medium"
          >
            匯入
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
