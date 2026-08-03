import { ref, onMounted, onUnmounted } from 'vue'
import { createGameClock } from './useGameClock'
import { createTaskStorage } from './useTaskStorage'
import {
  createCharacterTasks,
  getDefaultSharedCharacterTasks,
  getDefaultCharacterProgress,
  getDefaultAccountTasks,
  resetTaskProgress,
} from './useCharacterTasks'

export const categories = [
  { id: 'dungeon', name: '副本討伐', icon: '⚔️' },
  { id: 'guild', name: '公會活動', icon: '🏰' },
  { id: 'parttime', name: '兼職', icon: '💼' },
  { id: 'life', name: '生活/採集', icon: '🌿' },
  { id: 'shop', name: '商店買賣', icon: '🛒' },
  { id: 'other', name: '其他', icon: '📌' },
]

const presetCharacterDailyTasks = [
  { id: 'p_cd1', title: '每日挑戰', done: false, category: 'other' },
  { id: 'p_cd2', title: '週幾兼職', done: false, category: 'parttime' },
]

const presetAccountDailyTasks = [
  { id: 'p_ad1', title: '每日公會簽到', done: false, category: 'guild', scope: 'account' },
]

const presetCharacterWeeklyTasks = [
  { id: 'p_cw1', title: '會員兼職', done: false, category: 'parttime' },
  { id: 'p_cw2', title: '一般兼職', done: false, category: 'parttime', currentCount: 0, maxCount: 6 },
  { id: 'p_cw3', title: '魔物討伐證明', done: false, category: 'shop' },
  { id: 'p_cw4', title: '野外首領', done: false, category: 'dungeon' },
  { id: 'p_cw5', title: '深淵', done: false, category: 'dungeon', currentCount: 0, maxCount: 3 },
  { id: 'p_cw6', title: '不祥的召喚結界', done: false, category: 'dungeon', currentCount: 0, maxCount: 7 },
  {
    id: 'p_cw7',
    title: '黑色坑洞',
    done: false,
    category: 'dungeon',
    currentCount: 0,
    maxCount: 14,
    rampingWeekly: { base: 7, perDay: 1 },
  },
]

const presetAccountWeeklyTasks = [
  { id: 'p_aw1', title: '每週愛心幣聖水', done: false, category: 'shop', scope: 'account', currentCount: 0, maxCount: 20 },
  { id: 'p_aw2', title: '每週挑戰', done: false, category: 'other', scope: 'account' },
]

const presets = {
  presetCharacterDailyTasks,
  presetCharacterWeeklyTasks,
  presetAccountDailyTasks,
  presetAccountWeeklyTasks,
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function getCategoryInfo(catId) {
  return categories.find((c) => c.id === catId) || { name: '其他', icon: '📌' }
}

// Module-level singleton state (shared across all components)
const characters = ref([{ id: 'char_1', name: '主要角色' }])
const activeCharId = ref('char_1')
const showDashboard = ref(false)
const showImportExport = ref(false)
const editMode = ref(false)
const sharedCharacterTasks = ref(getDefaultSharedCharacterTasks(presets))
const characterProgress = ref(
  getDefaultCharacterProgress(characters.value, sharedCharacterTasks.value),
)
const accountTasks = ref(getDefaultAccountTasks(presets))

const lastDate = ref('')
const lastWeekKey = ref('')
const newTaskTitle = ref('')
const newTaskType = ref('daily')
const newTaskCategory = ref('dungeon')
const newTaskScope = ref('character')
const hasCountLimit = ref(false)
const maxCountInput = ref(3)
const dailyFilter = ref('all')
const weeklyFilter = ref('all')

const state = {
  characters,
  activeCharId,
  showDashboard,
  showImportExport,
  editMode,
  sharedCharacterTasks,
  characterProgress,
  accountTasks,
  lastDate,
  lastWeekKey,
  newTaskTitle,
  newTaskType,
  newTaskCategory,
  newTaskScope,
  hasCountLimit,
  maxCountInput,
  dailyFilter,
  weeklyFilter,
}

// Lazy holders to break circular factory dependencies
const storageApi = {
  saveData: () => false,
  loadData: () => {},
  ensureActiveCharacter: () => {},
  handleStorageChange: () => {},
  getExportText: () => '',
  importFromText: () => false,
}

const tasks = createCharacterTasks(state, {
  saveData: (...args) => storageApi.saveData(...args),
  ensureActiveCharacter: (...args) => storageApi.ensureActiveCharacter(...args),
  createId,
  presets,
})

const clock = createGameClock(
  { lastDate, lastWeekKey, accountTasks },
  {
    loadData: (...args) => storageApi.loadData(...args),
    resetAllCharacterPeriodProgress: tasks.resetAllCharacterPeriodProgress,
    refreshRampingWeeklyProgress: tasks.refreshRampingWeeklyProgress,
    resetTaskProgress,
  },
)

const storage = createTaskStorage(state, {
  ensurePeriodCurrent: clock.ensurePeriodCurrent,
  applyPeriodResets: clock.applyPeriodResets,
  ensureCharProgress: tasks.ensureCharProgress,
  presets,
})

Object.assign(storageApi, storage)

let initialized = false

function initTaskManager() {
  if (initialized) return
  initialized = true

  onMounted(() => {
    storage.loadData()
    clock.startClock()
    window.addEventListener('storage', storage.handleStorageChange)
  })

  onUnmounted(() => {
    clock.stopClock()
    window.removeEventListener('storage', storage.handleStorageChange)
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
    showImportExport,
    editMode,
    currentCharacterName: tasks.currentCharacterName,
    currentDailyTasks: tasks.currentDailyTasks,
    currentWeeklyTasks: tasks.currentWeeklyTasks,
    filteredDailyTasks: tasks.filteredDailyTasks,
    filteredWeeklyTasks: tasks.filteredWeeklyTasks,
    characterProgressOverview: tasks.characterProgressOverview,
    accountProgressOverview: tasks.accountProgressOverview,
    dailyFilter,
    weeklyFilter,
    lastDate,
    lastWeekKey,
    newTaskTitle,
    newTaskType,
    newTaskCategory,
    newTaskScope,
    hasCountLimit,
    maxCountInput,
    dailyCountdownText: clock.dailyCountdownText,
    weeklyCountdownText: clock.weeklyCountdownText,
    spawnCountdowns: clock.spawnCountdowns,
    getNextSpawnCountdown: clock.getNextSpawnCountdown,
    dailyDoneCount: tasks.dailyDoneCount,
    dailyProgress: tasks.dailyProgress,
    weeklyDoneCount: tasks.weeklyDoneCount,
    weeklyProgress: tasks.weeklyProgress,
    getCategoryInfo,
    switchCharacter: tasks.switchCharacter,
    switchCharacterFromDashboard: tasks.switchCharacterFromDashboard,
    addNewCharacter: tasks.addNewCharacter,
    deleteCurrentCharacter: tasks.deleteCurrentCharacter,
    renameCharacter: tasks.renameCharacter,
    renameCurrentCharacter: tasks.renameCurrentCharacter,
    toggleTask: tasks.toggleTask,
    updateTask: tasks.updateTask,
    incrementCount: tasks.incrementCount,
    decrementCount: tasks.decrementCount,
    addTask: tasks.addTask,
    addBlackHoleTask: tasks.addBlackHoleTask,
    loadPresetTemplates: tasks.loadPresetTemplates,
    deleteTask: tasks.deleteTask,
    resetDaily: tasks.resetDaily,
    resetWeekly: tasks.resetWeekly,
    getExportText: storage.getExportText,
    importFromText: storage.importFromText,
  }
}
