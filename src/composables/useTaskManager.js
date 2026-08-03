import { ref, computed, onMounted, onUnmounted } from 'vue'

const STORAGE_KEY = 'mabinogi_tasks_multi'

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

const BLACK_HOLE_TASK_ID = 'p_cw7'
const BLACK_HOLE_RAMPING = { base: 7, perDay: 1 }

const presetAccountWeeklyTasks = [
  { id: 'p_aw1', title: '每週愛心幣聖水', done: false, category: 'shop', scope: 'account', currentCount: 0, maxCount: 20 },
  { id: 'p_aw2', title: '每週挑戰', done: false, category: 'other', scope: 'account' },
]

// Module-level singleton state (shared across all components)
const characters = ref([{ id: 'char_1', name: '主要角色' }])
const activeCharId = ref('char_1')
const showDashboard = ref(false)
const showImportExport = ref(false)
const editMode = ref(false)
const sharedCharacterTasks = ref(getDefaultSharedCharacterTasks())
const characterProgress = ref(getDefaultCharacterProgress(characters.value, sharedCharacterTasks.value))
const accountTasks = ref({
  dailyTasks: JSON.parse(JSON.stringify(presetAccountDailyTasks)),
  weeklyTasks: JSON.parse(JSON.stringify(presetAccountWeeklyTasks)),
})

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
const dailyCountdownText = ref('00:00:00')
const weeklyCountdownText = ref('0天 00:00:00')

let timer = null
let initialized = false

function resolveRampingWeekly(task) {
  if (task?.rampingWeekly && typeof task.rampingWeekly === 'object') {
    return {
      base: Number(task.rampingWeekly.base) || 0,
      perDay: Number(task.rampingWeekly.perDay) || 0,
    }
  }
  if (task?.id === BLACK_HOLE_TASK_ID) {
    return { ...BLACK_HOLE_RAMPING }
  }
  return null
}

function toTaskDef(task) {
  const def = {
    id: task.id,
    title: task.title,
    category: task.category || 'other',
  }
  if (task.maxCount) def.maxCount = task.maxCount
  const ramp = resolveRampingWeekly(task)
  if (ramp) def.rampingWeekly = ramp
  return def
}

function getGameAdjustedDate(date = new Date()) {
  const d = new Date(date)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  return d
}

/** Mon=1 … Sun=7, using the app's 06:00 day boundary. */
function getMondayBasedDayIndex(date = new Date()) {
  const day = getGameAdjustedDate(date).getDay()
  return day === 0 ? 7 : day
}

function getEffectiveMaxCount(def, date = new Date()) {
  if (!def?.maxCount) return undefined
  const ramp = resolveRampingWeekly(def)
  if (!ramp) return def.maxCount
  const dayIndex = getMondayBasedDayIndex(date)
  return Math.min(def.maxCount, ramp.base + ramp.perDay * dayIndex)
}

function toAccountTaskDef(task) {
  const def = toTaskDef(task)
  def.scope = 'account'
  return def
}

function toSharedDefs(tasks) {
  return (tasks || []).filter((t) => t && typeof t.id === 'string').map(toTaskDef)
}

function createEmptyProgressEntry(maxCount) {
  const entry = { done: false }
  if (maxCount) entry.currentCount = 0
  return entry
}

function buildProgressMapForDefs(defs) {
  const map = {}
  for (const def of defs) {
    map[def.id] = createEmptyProgressEntry(def.maxCount)
  }
  return map
}

function getDefaultSharedCharacterTasks() {
  return {
    dailyTasks: toSharedDefs(presetCharacterDailyTasks),
    weeklyTasks: toSharedDefs(presetCharacterWeeklyTasks),
  }
}

function getDefaultCharacterProgress(chars, shared) {
  const next = {}
  for (const char of chars) {
    next[char.id] = {
      daily: buildProgressMapForDefs(shared.dailyTasks || []),
      weekly: buildProgressMapForDefs(shared.weeklyTasks || []),
    }
  }
  return next
}

function getDefaultCharacters() {
  return [{ id: 'char_1', name: '主要角色' }]
}

function getDefaultAccountTasks() {
  return {
    dailyTasks: JSON.parse(JSON.stringify(presetAccountDailyTasks)),
    weeklyTasks: JSON.parse(JSON.stringify(presetAccountWeeklyTasks)),
  }
}

function getCustomDateString(date = new Date()) {
  const d = new Date(date)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

function resetProgressEntry(entry, maxCount) {
  entry.done = false
  if (maxCount) entry.currentCount = 0
  else delete entry.currentCount
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

function normalizeCharacters(rawCharacters) {
  if (!Array.isArray(rawCharacters) || rawCharacters.length === 0) return null
  const normalized = []
  for (const char of rawCharacters) {
    if (!char || typeof char.id !== 'string' || !char.id.trim()) return null
    if (typeof char.name !== 'string') return null
    normalized.push({ id: char.id, name: char.name })
  }
  return normalized
}

function normalizeAccountTaskList(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const result = []
  for (const task of list) {
    if (!task || typeof task.id !== 'string' || !task.id.trim()) continue
    if (seen.has(task.id)) continue
    if (typeof task.title !== 'string') continue
    seen.add(task.id)
    result.push(toAccountTaskDef(task))
  }
  return result
}

function clampCount(value, maxCount) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(maxCount, Math.max(0, Math.floor(n)))
}

function createProgressEntryFromRaw(raw, maxCount) {
  if (!maxCount) {
    return { done: !!(raw && raw.done) }
  }
  let currentCount = clampCount(raw?.currentCount, maxCount)
  // Prefer stored currentCount; only treat bare done as "full" for legacy entries.
  if (raw?.done && (raw?.currentCount == null || !Number.isFinite(Number(raw.currentCount)))) {
    currentCount = maxCount
  }
  return {
    currentCount,
    done: currentCount >= maxCount,
  }
}

function hydrateAccountTask(def, raw) {
  const task = { ...def }
  if (def.maxCount) {
    const effectiveMax = getEffectiveMaxCount(def)
    const progress = createProgressEntryFromRaw(raw, effectiveMax)
    task.currentCount = progress.currentCount
    task.done = progress.done
    task.maxCount = effectiveMax
  } else {
    task.done = !!(raw && raw.done)
  }
  return task
}

function normalizeAccountTasks(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { dailyTasks: [], weeklyTasks: [] }
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) return []
    const seen = new Set()
    const result = []
    for (const task of list) {
      if (!task || typeof task.id !== 'string' || !task.id.trim()) continue
      if (seen.has(task.id)) continue
      if (typeof task.title !== 'string') continue
      seen.add(task.id)
      result.push(hydrateAccountTask(toAccountTaskDef(task), task))
    }
    return result
  }

  return {
    dailyTasks: normalizeList(raw.dailyTasks),
    weeklyTasks: normalizeList(raw.weeklyTasks),
  }
}

function mergeAccountTasksPreservingProgress(importedRaw, current) {
  const defs = {
    dailyTasks: normalizeAccountTaskList(importedRaw?.dailyTasks),
    weeklyTasks: normalizeAccountTaskList(importedRaw?.weeklyTasks),
  }

  function mergeList(defList, currentList) {
    const byId = Object.fromEntries(
      (currentList || []).filter((t) => t && typeof t.id === 'string').map((t) => [t.id, t]),
    )
    return defList.map((def) => {
      const prev = byId[def.id]
      return hydrateAccountTask(def, prev)
    })
  }

  return {
    dailyTasks: mergeList(defs.dailyTasks, current?.dailyTasks),
    weeklyTasks: mergeList(defs.weeklyTasks, current?.weeklyTasks),
  }
}

function normalizeSharedTaskList(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const result = []
  for (const task of list) {
    if (!task || typeof task.id !== 'string' || !task.id.trim()) continue
    if (seen.has(task.id)) continue
    if (typeof task.title !== 'string') continue
    seen.add(task.id)
    result.push(toTaskDef(task))
  }
  return result
}

function normalizeSharedCharacterTasks(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return getDefaultSharedCharacterTasks()
  }
  return {
    dailyTasks: normalizeSharedTaskList(raw.dailyTasks),
    weeklyTasks: normalizeSharedTaskList(raw.weeklyTasks),
  }
}

function normalizeProgressMap(rawMap, defs) {
  const source = rawMap && typeof rawMap === 'object' && !Array.isArray(rawMap) ? rawMap : {}
  const next = {}
  for (const def of defs) {
    const raw = source[def.id]
    const effectiveMax = getEffectiveMaxCount(def)
    if (raw && typeof raw === 'object') {
      next[def.id] = createProgressEntryFromRaw(raw, effectiveMax)
    } else {
      next[def.id] = createEmptyProgressEntry(def.maxCount)
    }
  }
  return next
}

function normalizeCharacterProgress(chars, shared, rawProgress) {
  const source =
    rawProgress && typeof rawProgress === 'object' && !Array.isArray(rawProgress) ? rawProgress : {}
  const next = {}
  for (const char of chars) {
    const entry = source[char.id]
    next[char.id] = {
      daily: normalizeProgressMap(entry?.daily, shared.dailyTasks),
      weekly: normalizeProgressMap(entry?.weekly, shared.weeklyTasks),
    }
  }
  return next
}

function appendDefsFromLegacyList(list, defs, idSet) {
  for (const task of list || []) {
    if (!task || typeof task.id !== 'string' || idSet.has(task.id)) continue
    idSet.add(task.id)
    defs.push(toTaskDef(task))
  }
}

function progressFromLegacyTask(task, def) {
  if (!task) return createEmptyProgressEntry(def?.maxCount)
  return createProgressEntryFromRaw(task, getEffectiveMaxCount(def) || def?.maxCount)
}

function migrateFromLegacyCharacterTasks(chars, activeId, rawCharacterTasks) {
  const source =
    rawCharacterTasks && typeof rawCharacterTasks === 'object' && !Array.isArray(rawCharacterTasks)
      ? rawCharacterTasks
      : {}

  const primaryId =
    typeof activeId === 'string' && chars.some((c) => c.id === activeId) ? activeId : chars[0]?.id
  const primaryEntry = source[primaryId] || {}

  const dailyDefs = []
  const weeklyDefs = []
  const dailyIds = new Set()
  const weeklyIds = new Set()

  appendDefsFromLegacyList(primaryEntry.dailyTasks, dailyDefs, dailyIds)
  appendDefsFromLegacyList(primaryEntry.weeklyTasks, weeklyDefs, weeklyIds)

  for (const char of chars) {
    const entry = source[char.id]
    if (!entry) continue
    appendDefsFromLegacyList(entry.dailyTasks, dailyDefs, dailyIds)
    appendDefsFromLegacyList(entry.weeklyTasks, weeklyDefs, weeklyIds)
  }

  const shared = { dailyTasks: dailyDefs, weeklyTasks: weeklyDefs }
  const progress = {}

  for (const char of chars) {
    const entry = source[char.id] || { dailyTasks: [], weeklyTasks: [] }
    const dailyById = Object.fromEntries((entry.dailyTasks || []).map((t) => [t.id, t]))
    const weeklyById = Object.fromEntries((entry.weeklyTasks || []).map((t) => [t.id, t]))

    const daily = {}
    for (const def of dailyDefs) {
      daily[def.id] = progressFromLegacyTask(dailyById[def.id], def)
    }
    const weekly = {}
    for (const def of weeklyDefs) {
      weekly[def.id] = progressFromLegacyTask(weeklyById[def.id], def)
    }
    progress[char.id] = { daily, weekly }
  }

  return { shared, progress }
}

function resolveSharedAndProgress(chars, activeId, parsed) {
  const hasNewFormat =
    parsed?.sharedCharacterTasks &&
    typeof parsed.sharedCharacterTasks === 'object' &&
    !Array.isArray(parsed.sharedCharacterTasks)

  if (hasNewFormat) {
    const shared = normalizeSharedCharacterTasks(parsed.sharedCharacterTasks)
    const progress = normalizeCharacterProgress(chars, shared, parsed.characterProgress)
    return { shared, progress }
  }

  return migrateFromLegacyCharacterTasks(chars, activeId, parsed?.characterTasks)
}

function extractSharedDefsFromPayload(parsed) {
  const hasNewFormat =
    parsed?.sharedCharacterTasks &&
    typeof parsed.sharedCharacterTasks === 'object' &&
    !Array.isArray(parsed.sharedCharacterTasks)

  if (hasNewFormat) {
    return normalizeSharedCharacterTasks(parsed.sharedCharacterTasks)
  }

  const source =
    parsed?.characterTasks &&
    typeof parsed.characterTasks === 'object' &&
    !Array.isArray(parsed.characterTasks)
      ? parsed.characterTasks
      : null
  if (!source) return null

  const dailyDefs = []
  const weeklyDefs = []
  const dailyIds = new Set()
  const weeklyIds = new Set()
  for (const entry of Object.values(source)) {
    if (!entry || typeof entry !== 'object') continue
    appendDefsFromLegacyList(entry.dailyTasks, dailyDefs, dailyIds)
    appendDefsFromLegacyList(entry.weeklyTasks, weeklyDefs, weeklyIds)
  }
  return { dailyTasks: dailyDefs, weeklyTasks: weeklyDefs }
}

function resolveActiveCharId(chars, rawActiveId) {
  if (typeof rawActiveId === 'string' && chars.some((c) => c.id === rawActiveId)) {
    return rawActiveId
  }
  return chars[0].id
}

function isValidImportPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
  const hasShared =
    parsed.sharedCharacterTasks &&
    typeof parsed.sharedCharacterTasks === 'object' &&
    !Array.isArray(parsed.sharedCharacterTasks)
  const hasAccount =
    parsed.accountTasks &&
    typeof parsed.accountTasks === 'object' &&
    !Array.isArray(parsed.accountTasks)
  const hasLegacy =
    parsed.characterTasks &&
    typeof parsed.characterTasks === 'object' &&
    !Array.isArray(parsed.characterTasks)
  return !!(hasShared || hasAccount || hasLegacy)
}

function ensureCharProgress(charId) {
  if (!characterProgress.value[charId]) {
    characterProgress.value[charId] = {
      daily: buildProgressMapForDefs(sharedCharacterTasks.value.dailyTasks),
      weekly: buildProgressMapForDefs(sharedCharacterTasks.value.weeklyTasks),
    }
  }
  return characterProgress.value[charId]
}

function findCharacterTaskPeriod(taskId) {
  if (sharedCharacterTasks.value.dailyTasks.some((t) => t.id === taskId)) return 'daily'
  if (sharedCharacterTasks.value.weeklyTasks.some((t) => t.id === taskId)) return 'weekly'
  return null
}

function findSharedTaskDef(taskId) {
  const period = findCharacterTaskPeriod(taskId)
  if (!period) return null
  const list =
    period === 'daily'
      ? sharedCharacterTasks.value.dailyTasks
      : sharedCharacterTasks.value.weeklyTasks
  return { period, def: list.find((t) => t.id === taskId) || null }
}

function getOrCreateProgressEntry(charId, period, taskId, maxCount) {
  const bucket = ensureCharProgress(charId)
  if (!bucket[period][taskId]) {
    bucket[period][taskId] = createEmptyProgressEntry(maxCount)
  }
  return bucket[period][taskId]
}

function mergeDefsWithProgress(defs, progressMap) {
  return (defs || []).map((def) => {
    const effectiveMax = getEffectiveMaxCount(def)
    const prog = createProgressEntryFromRaw(
      progressMap?.[def.id] || createEmptyProgressEntry(def.maxCount),
      effectiveMax,
    )
    const merged = {
      id: def.id,
      title: def.title,
      category: def.category,
      done: prog.done,
    }
    if (def.maxCount) {
      merged.maxCount = effectiveMax
      merged.currentCount = prog.currentCount
    }
    const ramp = resolveRampingWeekly(def)
    if (ramp) {
      merged.rampingWeekly = ramp
      merged.weeklyMaxCount = def.maxCount
    }
    return merged
  })
}

function getCharacterMergedTasks(charId) {
  const bucket = characterProgress.value[charId] || { daily: {}, weekly: {} }
  return {
    dailyTasks: mergeDefsWithProgress(sharedCharacterTasks.value.dailyTasks, bucket.daily),
    weeklyTasks: mergeDefsWithProgress(sharedCharacterTasks.value.weeklyTasks, bucket.weekly),
  }
}

function refreshRampingWeeklyProgress() {
  for (const def of sharedCharacterTasks.value.weeklyTasks || []) {
    if (!resolveRampingWeekly(def) || !def.maxCount) continue
    const effectiveMax = getEffectiveMaxCount(def)
    for (const char of characters.value) {
      const bucket = ensureCharProgress(char.id)
      const entry = bucket.weekly[def.id]
      if (!entry) {
        bucket.weekly[def.id] = createEmptyProgressEntry(def.maxCount)
      } else {
        bucket.weekly[def.id] = createProgressEntryFromRaw(entry, effectiveMax)
      }
    }
  }
}

function applyPeriodResets(needDaily, needWeekly) {
  if (needDaily) {
    resetAllCharacterPeriodProgress('daily')
    if (accountTasks.value.dailyTasks) {
      accountTasks.value.dailyTasks.forEach(resetTaskProgress)
    }
    refreshRampingWeeklyProgress()
  }
  if (needWeekly) {
    resetAllCharacterPeriodProgress('weekly')
    if (accountTasks.value.weeklyTasks) {
      accountTasks.value.weeklyTasks.forEach(resetTaskProgress)
    }
  }
}

function ensurePeriodCurrent() {
  const todayKey = getCustomDateString()
  const currentWeekKey = getCustomWeekKey()
  const needDaily = !!lastDate.value && lastDate.value !== todayKey
  const needWeekly = !!lastWeekKey.value && lastWeekKey.value !== currentWeekKey
  applyPeriodResets(needDaily, needWeekly)
  lastDate.value = todayKey
  lastWeekKey.value = currentWeekKey
}

function saveData() {
  ensurePeriodCurrent()
  const data = {
    lastDate: lastDate.value,
    lastWeekKey: lastWeekKey.value,
    activeCharId: activeCharId.value,
    characters: characters.value,
    sharedCharacterTasks: sharedCharacterTasks.value,
    characterProgress: characterProgress.value,
    accountTasks: accountTasks.value,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    alert('⚠️ 儲存失敗，瀏覽器儲存空間可能已滿。請匯出備份後清理空間再試。')
    return false
  }
}

function ensureActiveCharacter() {
  if (characters.value.length === 0) {
    characters.value = getDefaultCharacters()
    sharedCharacterTasks.value = getDefaultSharedCharacterTasks()
    characterProgress.value = getDefaultCharacterProgress(
      characters.value,
      sharedCharacterTasks.value,
    )
    accountTasks.value = getDefaultAccountTasks()
  }
  activeCharId.value = resolveActiveCharId(characters.value, activeCharId.value)
  ensureCharProgress(activeCharId.value)
}

function resetToDefaults(todayKey, currentWeekKey) {
  characters.value = getDefaultCharacters()
  activeCharId.value = characters.value[0].id
  sharedCharacterTasks.value = getDefaultSharedCharacterTasks()
  characterProgress.value = getDefaultCharacterProgress(
    characters.value,
    sharedCharacterTasks.value,
  )
  accountTasks.value = getDefaultAccountTasks()
  lastDate.value = todayKey
  lastWeekKey.value = currentWeekKey
  saveData()
}

function resetAllCharacterPeriodProgress(period) {
  const defs =
    period === 'daily'
      ? sharedCharacterTasks.value.dailyTasks
      : sharedCharacterTasks.value.weeklyTasks
  for (const char of characters.value) {
    const bucket = ensureCharProgress(char.id)
    for (const def of defs) {
      if (!bucket[period][def.id]) {
        bucket[period][def.id] = createEmptyProgressEntry(def.maxCount)
      } else {
        resetProgressEntry(bucket[period][def.id], def.maxCount)
      }
    }
  }
}

function loadData(options = {}) {
  const fromRemote = options.fromRemote === true
  const savedData = localStorage.getItem(STORAGE_KEY)
  const todayKey = getCustomDateString()
  const currentWeekKey = getCustomWeekKey()

  if (!savedData) {
    if (fromRemote) {
      resetToDefaults(todayKey, currentWeekKey)
    } else {
      lastDate.value = todayKey
      lastWeekKey.value = currentWeekKey
      saveData()
    }
    return
  }

  let parsed
  try {
    parsed = JSON.parse(savedData)
  } catch {
    if (!fromRemote) {
      localStorage.removeItem(STORAGE_KEY)
      resetToDefaults(todayKey, currentWeekKey)
    }
    return
  }

  const normalizedChars = normalizeCharacters(parsed.characters)
  if (!normalizedChars) {
    characters.value = getDefaultCharacters()
    activeCharId.value = characters.value[0].id
    const sharedDefs =
      extractSharedDefsFromPayload(parsed) || getDefaultSharedCharacterTasks()
    sharedCharacterTasks.value = sharedDefs
    characterProgress.value = getDefaultCharacterProgress(characters.value, sharedDefs)
    accountTasks.value = normalizeAccountTasks(parsed.accountTasks)
    ensureActiveCharacter()

    const needResetDaily = parsed.lastDate !== todayKey
    const needResetWeekly = parsed.lastWeekKey !== currentWeekKey
    applyPeriodResets(needResetDaily, needResetWeekly)
    lastDate.value = todayKey
    lastWeekKey.value = currentWeekKey
    saveData()
    if (!fromRemote) {
      alert('⚠️ 角色資料損毀，已還原為預設角色；任務清單與帳號任務已嘗試保留。')
    }
    return
  }

  characters.value = normalizedChars
  activeCharId.value = resolveActiveCharId(normalizedChars, parsed.activeCharId)
  const resolved = resolveSharedAndProgress(normalizedChars, activeCharId.value, parsed)
  sharedCharacterTasks.value = resolved.shared
  characterProgress.value = resolved.progress
  accountTasks.value = normalizeAccountTasks(parsed.accountTasks)
  ensureActiveCharacter()

  const needResetDaily = parsed.lastDate !== todayKey
  const needResetWeekly = parsed.lastWeekKey !== currentWeekKey
  applyPeriodResets(needResetDaily, needResetWeekly)

  lastDate.value = todayKey
  lastWeekKey.value = currentWeekKey
  if (!fromRemote || needResetDaily || needResetWeekly) {
    saveData()
  }
}

function handleStorageChange(event) {
  if (event.storageArea !== localStorage) return
  if (event.key !== STORAGE_KEY) return
  loadData({ fromRemote: true })
}

function checkPeriodReset() {
  const todayKey = getCustomDateString()
  const currentWeekKey = getCustomWeekKey()
  if (todayKey !== lastDate.value || currentWeekKey !== lastWeekKey.value) {
    loadData()
  }
}

function updateDailyCountdown() {
  const now = new Date()
  const target = new Date()
  target.setHours(6, 0, 0, 0)
  if (now >= target) target.setDate(target.getDate() + 1)

  const diffMs = target - now

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
  checkPeriodReset()
  updateDailyCountdown()
  updateWeeklyCountdown()
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    checkPeriodReset()
    updateDailyCountdown()
    updateWeeklyCountdown()
  }
}

const currentCharacterName = computed(() => {
  const char = characters.value.find((c) => c.id === activeCharId.value)
  return char ? char.name : '未知角色'
})

const currentDailyTasks = computed(() => {
  const account = accountTasks.value.dailyTasks || []
  const character = getCharacterMergedTasks(activeCharId.value).dailyTasks
  return [...account, ...character]
})

const currentWeeklyTasks = computed(() => {
  const account = accountTasks.value.weeklyTasks || []
  const character = getCharacterMergedTasks(activeCharId.value).weeklyTasks
  return [...account, ...character]
})

function buildProgressStats(dailyList, weeklyList) {
  const dDone = dailyList.filter((t) => t.done).length
  const wDone = weeklyList.filter((t) => t.done).length
  return {
    dailyDone: dDone,
    dailyTotal: dailyList.length,
    dailyPercent: dailyList.length === 0 ? 0 : Math.round((dDone / dailyList.length) * 100),
    weeklyDone: wDone,
    weeklyTotal: weeklyList.length,
    weeklyPercent: weeklyList.length === 0 ? 0 : Math.round((wDone / weeklyList.length) * 100),
  }
}

const characterProgressOverview = computed(() => {
  return characters.value.map((char) => {
    const merged = getCharacterMergedTasks(char.id)
    return {
      id: char.id,
      name: char.name,
      ...buildProgressStats(merged.dailyTasks, merged.weeklyTasks),
    }
  })
})

const accountProgressOverview = computed(() => {
  return buildProgressStats(
    accountTasks.value.dailyTasks || [],
    accountTasks.value.weeklyTasks || [],
  )
})

const filteredDailyTasks = computed(() => {
  const account = accountTasks.value.dailyTasks || []
  const character = getCharacterMergedTasks(activeCharId.value).dailyTasks
  let accountList = account
  let characterList = character
  if (dailyFilter.value !== 'all') {
    accountList = accountList.filter((t) => t.category === dailyFilter.value)
    characterList = characterList.filter((t) => t.category === dailyFilter.value)
  }
  return [...accountList, ...characterList]
})

const filteredWeeklyTasks = computed(() => {
  const account = accountTasks.value.weeklyTasks || []
  const character = getCharacterMergedTasks(activeCharId.value).weeklyTasks
  let accountList = account
  let characterList = character
  if (weeklyFilter.value !== 'all') {
    accountList = accountList.filter((t) => t.category === weeklyFilter.value)
    characterList = characterList.filter((t) => t.category === weeklyFilter.value)
  }
  return [...accountList, ...characterList]
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
  if (!characters.value.some((c) => c.id === charId)) return
  activeCharId.value = charId
  ensureActiveCharacter()
  saveData()
}

function switchCharacterFromDashboard(charId) {
  switchCharacter(charId)
  showDashboard.value = false
}

function addNewCharacter() {
  if (!editMode.value) return

  const name = prompt('請輸入新角色/分身名稱：', `分身 ${characters.value.length + 1}`)
  if (!name || !name.trim()) return

  const newId = createId('char')
  characters.value.push({ id: newId, name: name.trim() })

  characterProgress.value[newId] = {
    daily: buildProgressMapForDefs(sharedCharacterTasks.value.dailyTasks),
    weekly: buildProgressMapForDefs(sharedCharacterTasks.value.weeklyTasks),
  }

  activeCharId.value = newId
  saveData()
}

function deleteCurrentCharacter() {
  if (!editMode.value) return

  if (characters.value.length <= 1) {
    alert('⚠️ 至少需要保留一個角色！')
    return
  }

  if (confirm(`確定要刪除角色【${currentCharacterName.value}】及其所有任務進度嗎？`)) {
    const delId = activeCharId.value
    characters.value = characters.value.filter((c) => c.id !== delId)
    delete characterProgress.value[delId]
    activeCharId.value = characters.value[0].id
    saveData()
  }
}

function renameCharacter(charId, newName) {
  if (!editMode.value) return

  const trimmed = typeof newName === 'string' ? newName.trim() : ''
  if (!trimmed) return

  const char = characters.value.find((c) => c.id === charId)
  if (!char) return

  char.name = trimmed
  saveData()
}

function renameCurrentCharacter() {
  if (!editMode.value) return

  const name = prompt('請輸入角色名稱：', currentCharacterName.value)
  if (name === null) return
  renameCharacter(activeCharId.value, name)
}

function toggleTask(task) {
  if (!task) return

  if (task.scope === 'account') {
    task.done = !task.done
    if (task.maxCount) {
      const effectiveMax = getEffectiveMaxCount(task)
      task.currentCount = task.done ? effectiveMax : 0
    }
    saveData()
    return
  }

  const found = findSharedTaskDef(task.id)
  if (!found?.def) return

  const effectiveMax = getEffectiveMaxCount(found.def)
  const prog = getOrCreateProgressEntry(
    activeCharId.value,
    found.period,
    task.id,
    found.def.maxCount,
  )
  prog.done = !prog.done
  if (found.def.maxCount) {
    prog.currentCount = prog.done ? effectiveMax : 0
  }
  saveData()
}

function updateTask(task, patch) {
  if (!editMode.value || !task || !patch) return

  if (typeof patch.title === 'string') {
    const trimmed = patch.title.trim()
    if (!trimmed) return

    if (task.scope === 'account') {
      task.title = trimmed
    } else {
      const found = findSharedTaskDef(task.id)
      if (!found?.def) return
      found.def.title = trimmed
    }
  }

  saveData()
}

function incrementCount(task) {
  if (!task?.maxCount) return

  if (task.scope === 'account') {
    const effectiveMax = getEffectiveMaxCount(task)
    if ((task.currentCount || 0) < effectiveMax) {
      task.currentCount = (task.currentCount || 0) + 1
      if (task.currentCount === effectiveMax) {
        task.done = true
      }
      saveData()
    }
    return
  }

  const found = findSharedTaskDef(task.id)
  if (!found?.def?.maxCount) return

  const effectiveMax = getEffectiveMaxCount(found.def)
  const prog = getOrCreateProgressEntry(
    activeCharId.value,
    found.period,
    task.id,
    found.def.maxCount,
  )
  if ((prog.currentCount || 0) < effectiveMax) {
    prog.currentCount = (prog.currentCount || 0) + 1
    if (prog.currentCount === effectiveMax) {
      prog.done = true
    }
    saveData()
  }
}

function decrementCount(task) {
  if (!task?.maxCount) return

  if (task.scope === 'account') {
    const effectiveMax = getEffectiveMaxCount(task)
    if ((task.currentCount || 0) > 0) {
      task.currentCount = task.currentCount - 1
      if (task.currentCount < effectiveMax) {
        task.done = false
      }
      saveData()
    }
    return
  }

  const found = findSharedTaskDef(task.id)
  if (!found?.def?.maxCount) return

  const effectiveMax = getEffectiveMaxCount(found.def)
  const prog = getOrCreateProgressEntry(
    activeCharId.value,
    found.period,
    task.id,
    found.def.maxCount,
  )
  if ((prog.currentCount || 0) > 0) {
    prog.currentCount = prog.currentCount - 1
    if (prog.currentCount < effectiveMax) {
      prog.done = false
    }
    saveData()
  }
}

function initProgressForTaskOnAllCharacters(taskId, period, maxCount) {
  for (const char of characters.value) {
    const bucket = ensureCharProgress(char.id)
    bucket[period][taskId] = createEmptyProgressEntry(maxCount)
  }
}

function removeProgressForTaskOnAllCharacters(taskId, period) {
  for (const char of characters.value) {
    const bucket = characterProgress.value[char.id]
    if (bucket?.[period]) {
      delete bucket[period][taskId]
    }
  }
}

function addTask() {
  if (!editMode.value) return
  if (!newTaskTitle.value.trim()) return

  const isAccount = newTaskScope.value === 'account'
  const newTask = {
    id: createId(isAccount ? 'acc' : 'task'),
    title: newTaskTitle.value.trim(),
    done: false,
    category: newTaskCategory.value,
  }

  if (isAccount) {
    newTask.scope = 'account'
  }

  let maxCount
  if (hasCountLimit.value) {
    maxCount = Math.min(99, Math.max(1, Number(maxCountInput.value) || 1))
    newTask.maxCount = maxCount
    newTask.currentCount = 0
  }

  if (isAccount) {
    if (newTaskType.value === 'daily') {
      accountTasks.value.dailyTasks.push(newTask)
    } else {
      accountTasks.value.weeklyTasks.push(newTask)
    }
  } else {
    const period = newTaskType.value === 'daily' ? 'daily' : 'weekly'
    const def = toTaskDef(newTask)
    if (period === 'daily') {
      sharedCharacterTasks.value.dailyTasks.push(def)
    } else {
      sharedCharacterTasks.value.weeklyTasks.push(def)
    }
    initProgressForTaskOnAllCharacters(def.id, period, def.maxCount)
  }

  newTaskTitle.value = ''
  hasCountLimit.value = false
  saveData()
}

function addBlackHoleTask() {
  if (!editMode.value) return

  const weekly = sharedCharacterTasks.value.weeklyTasks || []
  const exists = weekly.some(
    (task) => task.id === BLACK_HOLE_TASK_ID || task.title === '黑色坑洞',
  )
  if (exists) {
    alert('⚠️ 黑色坑洞任務已存在。')
    return
  }

  const preset = presetCharacterWeeklyTasks.find((t) => t.id === BLACK_HOLE_TASK_ID)
  if (!preset) return

  const def = toTaskDef(preset)
  sharedCharacterTasks.value.weeklyTasks.push(def)
  initProgressForTaskOnAllCharacters(def.id, 'weekly', def.maxCount)
  saveData()
}

function loadPresetTemplates() {
  ensureActiveCharacter()

  if (
    !confirm(
      '確定要將所有角色共用任務清單與帳號共用任務重置為預設嗎？現有任務與進度會被覆蓋。',
    )
  ) {
    return
  }

  sharedCharacterTasks.value = getDefaultSharedCharacterTasks()
  characterProgress.value = getDefaultCharacterProgress(
    characters.value,
    sharedCharacterTasks.value,
  )
  accountTasks.value = getDefaultAccountTasks()
  saveData()
}

function deleteTask(type, id) {
  if (!editMode.value) return

  const accountList = type === 'daily' ? accountTasks.value.dailyTasks : accountTasks.value.weeklyTasks
  if (accountList.some((task) => task.id === id)) {
    if (type === 'daily') {
      accountTasks.value.dailyTasks = accountTasks.value.dailyTasks.filter((task) => task.id !== id)
    } else {
      accountTasks.value.weeklyTasks = accountTasks.value.weeklyTasks.filter((task) => task.id !== id)
    }
    saveData()
    return
  }

  const period = type === 'daily' ? 'daily' : 'weekly'
  if (period === 'daily') {
    sharedCharacterTasks.value.dailyTasks = sharedCharacterTasks.value.dailyTasks.filter(
      (task) => task.id !== id,
    )
  } else {
    sharedCharacterTasks.value.weeklyTasks = sharedCharacterTasks.value.weeklyTasks.filter(
      (task) => task.id !== id,
    )
  }
  removeProgressForTaskOnAllCharacters(id, period)
  saveData()
}

function resetDaily() {
  if (
    !confirm(
      `確定要重置【${currentCharacterName.value}】與帳號共用的每日任務進度嗎？`,
    )
  ) {
    return
  }
  ensureActiveCharacter()
  const bucket = ensureCharProgress(activeCharId.value)
  for (const def of sharedCharacterTasks.value.dailyTasks) {
    if (!bucket.daily[def.id]) {
      bucket.daily[def.id] = createEmptyProgressEntry(def.maxCount)
    } else {
      resetProgressEntry(bucket.daily[def.id], def.maxCount)
    }
  }
  if (accountTasks.value.dailyTasks) {
    accountTasks.value.dailyTasks.forEach(resetTaskProgress)
  }
  saveData()
}

function resetWeekly() {
  if (
    !confirm(
      `確定要重置【${currentCharacterName.value}】與帳號共用的每週任務進度嗎？`,
    )
  ) {
    return
  }
  ensureActiveCharacter()
  const bucket = ensureCharProgress(activeCharId.value)
  for (const def of sharedCharacterTasks.value.weeklyTasks) {
    if (!bucket.weekly[def.id]) {
      bucket.weekly[def.id] = createEmptyProgressEntry(def.maxCount)
    } else {
      resetProgressEntry(bucket.weekly[def.id], def.maxCount)
    }
  }
  if (accountTasks.value.weeklyTasks) {
    accountTasks.value.weeklyTasks.forEach(resetTaskProgress)
  }
  saveData()
}

function getExportText() {
  const data = {
    sharedCharacterTasks: {
      dailyTasks: (sharedCharacterTasks.value.dailyTasks || []).map(toTaskDef),
      weeklyTasks: (sharedCharacterTasks.value.weeklyTasks || []).map(toTaskDef),
    },
    accountTasks: {
      dailyTasks: (accountTasks.value.dailyTasks || []).map(toAccountTaskDef),
      weeklyTasks: (accountTasks.value.weeklyTasks || []).map(toAccountTaskDef),
    },
  }
  return JSON.stringify(data, null, 2)
}

function importFromText(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (!isValidImportPayload(parsed)) {
      alert('⚠️ 文字格式不符合任務清單規格！')
      return false
    }

    if (!confirm('匯入會覆蓋目前的任務清單（不會更改完成狀態與週期日期），確定要繼續嗎？')) {
      return false
    }

    const hasAccount =
      parsed.accountTasks &&
      typeof parsed.accountTasks === 'object' &&
      !Array.isArray(parsed.accountTasks)
    const sharedDefs = extractSharedDefsFromPayload(parsed)

    if (sharedDefs) {
      sharedCharacterTasks.value = sharedDefs
      characterProgress.value = normalizeCharacterProgress(
        characters.value,
        sharedDefs,
        characterProgress.value,
      )
    }

    if (hasAccount) {
      accountTasks.value = mergeAccountTasksPreservingProgress(
        parsed.accountTasks,
        accountTasks.value,
      )
    }

    ensureActiveCharacter()
    saveData()
    alert('🎉 任務清單匯入成功！完成狀態與週期日期已保留。')
    return true
  } catch {
    alert('❌ 解析 JSON 文字失敗，請確認格式是否正確。')
    return false
  }
}

function initTaskManager() {
  if (initialized) return
  initialized = true

  onMounted(() => {
    loadData()
    updateAllCountdowns()
    timer = setInterval(updateAllCountdowns, 1000)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('storage', handleStorageChange)
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
    currentCharacterName,
    currentDailyTasks,
    currentWeeklyTasks,
    filteredDailyTasks,
    filteredWeeklyTasks,
    characterProgressOverview,
    accountProgressOverview,
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
    renameCharacter,
    renameCurrentCharacter,
    toggleTask,
    updateTask,
    incrementCount,
    decrementCount,
    addTask,
    addBlackHoleTask,
    loadPresetTemplates,
    deleteTask,
    resetDaily,
    resetWeekly,
    getExportText,
    importFromText,
  }
}
