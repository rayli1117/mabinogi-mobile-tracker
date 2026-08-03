import {
  toTaskDef,
  toAccountTaskDef,
  getEffectiveMaxCount,
  createEmptyProgressEntry,
  createProgressEntryFromRaw,
  getDefaultSharedCharacterTasks,
  getDefaultCharacterProgress,
  getDefaultCharacters,
  getDefaultAccountTasks,
} from './useCharacterTasks'
import { getCustomDateString, getCustomWeekKey } from './useGameClock'

const STORAGE_KEY = 'mabinogi_tasks_multi'

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

function normalizeSharedCharacterTasks(raw, presets) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return getDefaultSharedCharacterTasks(presets)
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

function resolveSharedAndProgress(chars, activeId, parsed, presets) {
  const hasNewFormat =
    parsed?.sharedCharacterTasks &&
    typeof parsed.sharedCharacterTasks === 'object' &&
    !Array.isArray(parsed.sharedCharacterTasks)

  if (hasNewFormat) {
    const shared = normalizeSharedCharacterTasks(parsed.sharedCharacterTasks, presets)
    const progress = normalizeCharacterProgress(chars, shared, parsed.characterProgress)
    return { shared, progress }
  }

  return migrateFromLegacyCharacterTasks(chars, activeId, parsed?.characterTasks)
}

function extractSharedDefsFromPayload(parsed, presets) {
  const hasNewFormat =
    parsed?.sharedCharacterTasks &&
    typeof parsed.sharedCharacterTasks === 'object' &&
    !Array.isArray(parsed.sharedCharacterTasks)

  if (hasNewFormat) {
    return normalizeSharedCharacterTasks(parsed.sharedCharacterTasks, presets)
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

/**
 * @param {object} state - shared Vue refs
 * @param {{
 *   ensurePeriodCurrent: () => void,
 *   applyPeriodResets: (needDaily: boolean, needWeekly: boolean) => void,
 *   ensureCharProgress: (charId: string) => object,
 *   presets: object,
 * }} deps
 */
export function createTaskStorage(state, deps) {
  const {
    characters,
    activeCharId,
    sharedCharacterTasks,
    characterProgress,
    accountTasks,
    lastDate,
    lastWeekKey,
  } = state

  const { ensurePeriodCurrent, applyPeriodResets, ensureCharProgress, presets } = deps

  function ensureActiveCharacter() {
    if (characters.value.length === 0) {
      characters.value = getDefaultCharacters()
      sharedCharacterTasks.value = getDefaultSharedCharacterTasks(presets)
      characterProgress.value = getDefaultCharacterProgress(
        characters.value,
        sharedCharacterTasks.value,
      )
      accountTasks.value = getDefaultAccountTasks(presets)
    }
    activeCharId.value = resolveActiveCharId(characters.value, activeCharId.value)
    ensureCharProgress(activeCharId.value)
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

  function resetToDefaults(todayKey, currentWeekKey) {
    characters.value = getDefaultCharacters()
    activeCharId.value = characters.value[0].id
    sharedCharacterTasks.value = getDefaultSharedCharacterTasks(presets)
    characterProgress.value = getDefaultCharacterProgress(
      characters.value,
      sharedCharacterTasks.value,
    )
    accountTasks.value = getDefaultAccountTasks(presets)
    lastDate.value = todayKey
    lastWeekKey.value = currentWeekKey
    saveData()
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
        extractSharedDefsFromPayload(parsed, presets) || getDefaultSharedCharacterTasks(presets)
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
    const resolved = resolveSharedAndProgress(
      normalizedChars,
      activeCharId.value,
      parsed,
      presets,
    )
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
      const sharedDefs = extractSharedDefsFromPayload(parsed, presets)

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

  return {
    STORAGE_KEY,
    saveData,
    loadData,
    ensureActiveCharacter,
    handleStorageChange,
    getExportText,
    importFromText,
  }
}
