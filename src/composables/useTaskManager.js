import { ref, computed, onMounted, onUnmounted } from 'vue'

const STORAGE_KEY = 'mabinogi_tasks_multi'

export const categories = [
  { id: 'dungeon', name: '副本討伐', icon: '⚔️' },
  { id: 'guild', name: '公會活動', icon: '🏰' },
  { id: 'life', name: '生活/採集', icon: '🌿' },
  { id: 'shop', name: '商店買賣', icon: '🛒' },
  { id: 'other', name: '其他', icon: '📌' },
]

const presetDailyTasks = [
  { id: 'p_d1', title: '每日公會簽到', done: false, pinned: false, category: 'guild' },
  { id: 'p_d2', title: '每日地下城討伐', done: false, pinned: true, category: 'dungeon', currentCount: 0, maxCount: 3 },
  { id: 'p_d3', title: '每日限購商店物資購買', done: false, pinned: false, category: 'shop' },
  { id: 'p_d4', title: '每日生活採集/生產', done: false, pinned: false, category: 'life' },
]

const presetWeeklyTasks = [
  { id: 'p_w1', title: '每週團隊副本討伐', done: false, pinned: true, category: 'dungeon', currentCount: 0, maxCount: 2 },
  { id: 'p_w2', title: '每週公會貢獻任務', done: false, pinned: false, category: 'guild' },
  { id: 'p_w3', title: '每週限額物資兌換', done: false, pinned: false, category: 'shop' },
]

// Module-level singleton state (shared across all components)
const characters = ref([{ id: 'char_1', name: '主要角色' }])
const activeCharId = ref('char_1')
const showDashboard = ref(false)
const characterTasks = ref({
  char_1: {
    dailyTasks: JSON.parse(JSON.stringify(presetDailyTasks)),
    weeklyTasks: JSON.parse(JSON.stringify(presetWeeklyTasks)),
  },
})

const lastDate = ref('')
const lastWeekKey = ref('')
const newTaskTitle = ref('')
const newTaskType = ref('daily')
const newTaskCategory = ref('dungeon')
const newTaskPinned = ref(false)
const hasCountLimit = ref(false)
const maxCountInput = ref(3)
const dailyFilter = ref('all')
const weeklyFilter = ref('all')
const fileInput = ref(null)
const dailyCountdownText = ref('00:00:00')
const weeklyCountdownText = ref('0天 00:00:00')

let timer = null
let initialized = false

function getCustomDateString(date = new Date()) {
  const d = new Date(date)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function getCustomWeekKey(date = new Date()) {
  const d = new Date(date)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${weekNo < 10 ? '0' + weekNo : weekNo}`
}

function resetTaskProgress(task) {
  task.done = false
  if (task.maxCount) task.currentCount = 0
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return Number(a.done) - Number(b.done)
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned)
    return 0
  })
}

function getCategoryInfo(catId) {
  return categories.find((c) => c.id === catId) || { name: '其他', icon: '📌' }
}

function saveData() {
  const data = {
    lastDate: getCustomDateString(),
    lastWeekKey: getCustomWeekKey(),
    activeCharId: activeCharId.value,
    characters: characters.value,
    characterTasks: characterTasks.value,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  lastDate.value = data.lastDate
  lastWeekKey.value = data.lastWeekKey
}

function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY)
  const todayKey = getCustomDateString()
  const currentWeekKey = getCustomWeekKey()

  if (savedData) {
    const parsed = JSON.parse(savedData)
    characters.value = parsed.characters || [{ id: 'char_1', name: '主要角色' }]
    activeCharId.value = parsed.activeCharId || characters.value[0].id
    characterTasks.value = parsed.characterTasks || {}

    const needResetDaily = parsed.lastDate !== todayKey
    const needResetWeekly = parsed.lastWeekKey !== currentWeekKey

    Object.keys(characterTasks.value).forEach((cId) => {
      const charData = characterTasks.value[cId]
      if (needResetDaily && charData.dailyTasks) {
        charData.dailyTasks.forEach(resetTaskProgress)
      }
      if (needResetWeekly && charData.weeklyTasks) {
        charData.weeklyTasks.forEach(resetTaskProgress)
      }
    })

    lastDate.value = todayKey
    lastWeekKey.value = currentWeekKey
    saveData()
  } else {
    lastDate.value = todayKey
    lastWeekKey.value = currentWeekKey
    saveData()
  }
}

function updateDailyCountdown() {
  const now = new Date()
  const target = new Date()
  target.setHours(6, 0, 0, 0)
  if (now >= target) target.setDate(target.getDate() + 1)

  const diffMs = target - now
  if (diffMs <= 1000) loadData()

  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (num) => String(num).padStart(2, '0')
  dailyCountdownText.value = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function updateWeeklyCountdown() {
  const now = new Date()
  const target = new Date()
  target.setHours(6, 0, 0, 0)
  const currentDay = now.getDay()
  let daysUntilMonday = (1 + 7 - currentDay) % 7
  if (daysUntilMonday === 0 && now >= target) daysUntilMonday = 7

  target.setDate(now.getDate() + daysUntilMonday)
  const diffMs = target - now

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (num) => String(num).padStart(2, '0')
  weeklyCountdownText.value = `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function updateAllCountdowns() {
  updateDailyCountdown()
  updateWeeklyCountdown()
}

const currentCharacterName = computed(() => {
  const char = characters.value.find((c) => c.id === activeCharId.value)
  return char ? char.name : '未知角色'
})

const currentDailyTasks = computed(() => {
  if (!characterTasks.value[activeCharId.value]) return []
  return characterTasks.value[activeCharId.value].dailyTasks || []
})

const currentWeeklyTasks = computed(() => {
  if (!characterTasks.value[activeCharId.value]) return []
  return characterTasks.value[activeCharId.value].weeklyTasks || []
})

const characterProgressOverview = computed(() => {
  return characters.value.map((char) => {
    const charData = characterTasks.value[char.id] || { dailyTasks: [], weeklyTasks: [] }
    const dTasks = charData.dailyTasks || []
    const wTasks = charData.weeklyTasks || []

    const dDone = dTasks.filter((t) => t.done).length
    const wDone = wTasks.filter((t) => t.done).length

    const dPercent = dTasks.length === 0 ? 0 : Math.round((dDone / dTasks.length) * 100)
    const wPercent = wTasks.length === 0 ? 0 : Math.round((wDone / wTasks.length) * 100)

    return {
      id: char.id,
      name: char.name,
      dailyDone: dDone,
      dailyTotal: dTasks.length,
      dailyPercent: dPercent,
      weeklyDone: wDone,
      weeklyTotal: wTasks.length,
      weeklyPercent: wPercent,
    }
  })
})

const filteredDailyTasks = computed(() => {
  let list = currentDailyTasks.value
  if (dailyFilter.value !== 'all') {
    list = list.filter((t) => t.category === dailyFilter.value)
  }
  return sortTasks(list)
})

const filteredWeeklyTasks = computed(() => {
  let list = currentWeeklyTasks.value
  if (weeklyFilter.value !== 'all') {
    list = list.filter((t) => t.category === weeklyFilter.value)
  }
  return sortTasks(list)
})

const dailyDoneCount = computed(() => currentDailyTasks.value.filter((t) => t.done).length)
const dailyProgress = computed(() => {
  if (currentDailyTasks.value.length === 0) return 0
  return Math.round((dailyDoneCount.value / currentDailyTasks.value.length) * 100)
})

const weeklyDoneCount = computed(() => currentWeeklyTasks.value.filter((t) => t.done).length)
const weeklyProgress = computed(() => {
  if (currentWeeklyTasks.value.length === 0) return 0
  return Math.round((weeklyDoneCount.value / currentWeeklyTasks.value.length) * 100)
})

function switchCharacter(charId) {
  activeCharId.value = charId
  saveData()
}

function switchCharacterFromDashboard(charId) {
  switchCharacter(charId)
  showDashboard.value = false
}

function addNewCharacter() {
  const name = prompt('請輸入新角色/分身名稱：', `分身 ${characters.value.length + 1}`)
  if (!name || !name.trim()) return

  const newId = 'char_' + Date.now()
  characters.value.push({ id: newId, name: name.trim() })

  characterTasks.value[newId] = {
    dailyTasks: JSON.parse(JSON.stringify(presetDailyTasks)),
    weeklyTasks: JSON.parse(JSON.stringify(presetWeeklyTasks)),
  }

  activeCharId.value = newId
  saveData()
}

function deleteCurrentCharacter() {
  if (characters.value.length <= 1) {
    alert('⚠️ 至少需要保留一個角色！')
    return
  }

  if (confirm(`確定要刪除角色【${currentCharacterName.value}】及其所有任務進度嗎？`)) {
    const delId = activeCharId.value
    characters.value = characters.value.filter((c) => c.id !== delId)
    delete characterTasks.value[delId]
    activeCharId.value = characters.value[0].id
    saveData()
  }
}

function toggleTask(task) {
  task.done = !task.done
  if (task.maxCount) {
    task.currentCount = task.done ? task.maxCount : 0
  }
  saveData()
}

function togglePin(task) {
  task.pinned = !task.pinned
  saveData()
}

function incrementCount(task) {
  if (!task.maxCount) return
  if ((task.currentCount || 0) < task.maxCount) {
    task.currentCount = (task.currentCount || 0) + 1
    if (task.currentCount === task.maxCount) {
      task.done = true
    }
    saveData()
  }
}

function decrementCount(task) {
  if (!task.maxCount) return
  if ((task.currentCount || 0) > 0) {
    task.currentCount = task.currentCount - 1
    if (task.currentCount < task.maxCount) {
      task.done = false
    }
    saveData()
  }
}

function addTask() {
  if (!newTaskTitle.value.trim()) return

  const newTask = {
    id: Date.now().toString(),
    title: newTaskTitle.value.trim(),
    done: false,
    pinned: newTaskPinned.value,
    category: newTaskCategory.value,
  }

  if (hasCountLimit.value && maxCountInput.value > 1) {
    newTask.maxCount = maxCountInput.value
    newTask.currentCount = 0
  }

  const currentTasks = characterTasks.value[activeCharId.value]
  if (!currentTasks) return

  if (newTaskType.value === 'daily') {
    currentTasks.dailyTasks.push(newTask)
  } else {
    currentTasks.weeklyTasks.push(newTask)
  }

  newTaskTitle.value = ''
  newTaskPinned.value = false
  hasCountLimit.value = false
  saveData()
}

function loadPresetTemplates() {
  const currentTasks = characterTasks.value[activeCharId.value]
  if (!currentTasks) return

  if (currentTasks.dailyTasks.length > 0 || currentTasks.weeklyTasks.length > 0) {
    if (!confirm(`載入範本會將常態任務補充至【${currentCharacterName.value}】的清單中，是否繼續？`)) return
  }

  presetDailyTasks.forEach((pt) => {
    if (!currentTasks.dailyTasks.some((t) => t.title === pt.title)) {
      currentTasks.dailyTasks.push(JSON.parse(JSON.stringify(pt)))
    }
  })

  presetWeeklyTasks.forEach((pt) => {
    if (!currentTasks.weeklyTasks.some((t) => t.title === pt.title)) {
      currentTasks.weeklyTasks.push(JSON.parse(JSON.stringify(pt)))
    }
  })

  saveData()
}

function deleteTask(type, id) {
  const currentTasks = characterTasks.value[activeCharId.value]
  if (!currentTasks) return

  if (type === 'daily') {
    currentTasks.dailyTasks = currentTasks.dailyTasks.filter((task) => task.id !== id)
  } else {
    currentTasks.weeklyTasks = currentTasks.weeklyTasks.filter((task) => task.id !== id)
  }
  saveData()
}

function resetDaily() {
  const currentTasks = characterTasks.value[activeCharId.value]
  if (currentTasks && currentTasks.dailyTasks) {
    currentTasks.dailyTasks.forEach(resetTaskProgress)
    saveData()
  }
}

function resetWeekly() {
  const currentTasks = characterTasks.value[activeCharId.value]
  if (currentTasks && currentTasks.weeklyTasks) {
    currentTasks.weeklyTasks.forEach(resetTaskProgress)
    saveData()
  }
}

function exportData() {
  const data = {
    lastDate: getCustomDateString(),
    lastWeekKey: getCustomWeekKey(),
    activeCharId: activeCharId.value,
    characters: characters.value,
    characterTasks: characterTasks.value,
  }
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `mabinogi_tasks_multi_${getCustomDateString()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerFileInput() {
  if (fileInput.value) fileInput.value.click()
}

function importData(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result)
      if (parsed.characters && parsed.characterTasks) {
        characters.value = parsed.characters
        activeCharId.value = parsed.activeCharId || characters.value[0].id
        characterTasks.value = parsed.characterTasks
        saveData()
        alert('🎉 包含所有角色的任務備份匯入成功！')
      } else {
        alert('⚠️ 檔案格式不符合多角色任務清單規格！')
      }
    } catch {
      alert('❌ 解析 JSON 檔案失敗，請確認檔案格式是否正確。')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

function initTaskManager() {
  if (initialized) return
  initialized = true

  onMounted(() => {
    loadData()
    updateAllCountdowns()
    timer = setInterval(updateAllCountdowns, 1000)
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    initialized = false
  })
}

export function useTaskManager() {
  initTaskManager()

  return {
    categories,
    characters,
    activeCharId,
    showDashboard,
    currentCharacterName,
    currentDailyTasks,
    currentWeeklyTasks,
    filteredDailyTasks,
    filteredWeeklyTasks,
    characterProgressOverview,
    dailyFilter,
    weeklyFilter,
    lastDate,
    lastWeekKey,
    newTaskTitle,
    newTaskType,
    newTaskCategory,
    newTaskPinned,
    hasCountLimit,
    maxCountInput,
    fileInput,
    dailyCountdownText,
    weeklyCountdownText,
    dailyDoneCount,
    dailyProgress,
    weeklyDoneCount,
    weeklyProgress,
    getCategoryInfo,
    switchCharacter,
    switchCharacterFromDashboard,
    addNewCharacter,
    deleteCurrentCharacter,
    toggleTask,
    togglePin,
    incrementCount,
    decrementCount,
    addTask,
    loadPresetTemplates,
    deleteTask,
    resetDaily,
    resetWeekly,
    exportData,
    triggerFileInput,
    importData,
  }
}
