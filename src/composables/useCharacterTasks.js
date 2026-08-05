import { computed } from 'vue'
import { getMondayBasedDayIndex } from './useGameClock'

const BLACK_HOLE_TASK_ID = 'p_cw7'
const BLACK_HOLE_RAMPING = { base: 7, perDay: 1 }

export function resolveRampingWeekly(task) {
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

export function toTaskDef(task) {
  const def = {
    id: task.id,
    title: task.title,
    category: task.category || 'other',
  }
  if (task.maxCount) def.maxCount = task.maxCount
  const ramp = resolveRampingWeekly(task)
  if (ramp) def.rampingWeekly = ramp
  if (typeof task.notes === 'string' && task.notes.trim()) {
    def.notes = task.notes.trim()
  }
  return def
}

export function toAccountTaskDef(task) {
  const def = toTaskDef(task)
  def.scope = 'account'
  return def
}

export function getEffectiveMaxCount(def, date = new Date()) {
  if (!def?.maxCount) return undefined
  const ramp = resolveRampingWeekly(def)
  if (!ramp) return def.maxCount
  const dayIndex = getMondayBasedDayIndex(date)
  return Math.min(def.maxCount, ramp.base + ramp.perDay * dayIndex)
}

export function createEmptyProgressEntry(maxCount) {
  const entry = { done: false }
  if (maxCount) entry.currentCount = 0
  return entry
}

export function buildProgressMapForDefs(defs) {
  const map = {}
  for (const def of defs) {
    map[def.id] = createEmptyProgressEntry(def.maxCount)
  }
  return map
}

function clampCount(value, maxCount) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(maxCount, Math.max(0, Math.floor(n)))
}

export function createProgressEntryFromRaw(raw, maxCount) {
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

export function resetTaskProgress(task) {
  task.done = false
  if (task.maxCount) task.currentCount = 0
}

export function resetProgressEntry(entry, maxCount) {
  entry.done = false
  if (maxCount) entry.currentCount = 0
  else delete entry.currentCount
}

function toSharedDefs(tasks) {
  return (tasks || []).filter((t) => t && typeof t.id === 'string').map(toTaskDef)
}

export function getDefaultSharedCharacterTasks(presets) {
  return {
    dailyTasks: toSharedDefs(presets.presetCharacterDailyTasks),
    weeklyTasks: toSharedDefs(presets.presetCharacterWeeklyTasks),
  }
}

export function getDefaultCharacterProgress(chars, shared) {
  const next = {}
  for (const char of chars) {
    next[char.id] = {
      daily: buildProgressMapForDefs(shared.dailyTasks || []),
      weekly: buildProgressMapForDefs(shared.weeklyTasks || []),
    }
  }
  return next
}

export function getDefaultCharacters() {
  return [{ id: 'char_1', name: '主要角色' }]
}

export function getDefaultAccountTasks(presets) {
  return {
    dailyTasks: JSON.parse(JSON.stringify(presets.presetAccountDailyTasks)),
    weeklyTasks: JSON.parse(JSON.stringify(presets.presetAccountWeeklyTasks)),
  }
}

/**
 * @param {object} state - shared Vue refs
 * @param {{
 *   saveData: () => boolean | void,
 *   ensureActiveCharacter: () => void,
 *   createId: (prefix: string) => string,
 *   presets: {
 *     presetCharacterDailyTasks: object[],
 *     presetCharacterWeeklyTasks: object[],
 *     presetAccountDailyTasks: object[],
 *     presetAccountWeeklyTasks: object[],
 *   },
 * }} deps
 */
export function createCharacterTasks(state, deps) {
  const {
    characters,
    activeCharId,
    showDashboard,
    editMode,
    sharedCharacterTasks,
    characterProgress,
    accountTasks,
    newTaskTitle,
    newTaskType,
    newTaskCategory,
    newTaskScope,
    hasCountLimit,
    maxCountInput,
    dailyFilter,
    weeklyFilter,
  } = state

  const { saveData, ensureActiveCharacter, createId, presets } = deps

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
      if (def.notes) merged.notes = def.notes
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

  function findAccountTask(taskId) {
    const daily = (accountTasks.value.dailyTasks || []).find((t) => t.id === taskId)
    if (daily) return daily
    return (accountTasks.value.weeklyTasks || []).find((t) => t.id === taskId) || null
  }

  function setTaskNotes(taskId, notes) {
    if (typeof taskId !== 'string' || !taskId) return false

    const trimmed = typeof notes === 'string' ? notes.trim() : ''
    const accountTask = findAccountTask(taskId)
    if (accountTask) {
      if (trimmed) accountTask.notes = trimmed
      else delete accountTask.notes
      saveData()
      return true
    }

    const found = findSharedTaskDef(taskId)
    if (!found?.def) return false

    if (trimmed) found.def.notes = trimmed
    else delete found.def.notes
    saveData()
    return true
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

    const preset = presets.presetCharacterWeeklyTasks.find((t) => t.id === BLACK_HOLE_TASK_ID)
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

    sharedCharacterTasks.value = getDefaultSharedCharacterTasks(presets)
    characterProgress.value = getDefaultCharacterProgress(
      characters.value,
      sharedCharacterTasks.value,
    )
    accountTasks.value = getDefaultAccountTasks(presets)
    saveData()
  }

  function deleteTask(type, id) {
    if (!editMode.value) return

    const accountList =
      type === 'daily' ? accountTasks.value.dailyTasks : accountTasks.value.weeklyTasks
    if (accountList.some((task) => task.id === id)) {
      if (type === 'daily') {
        accountTasks.value.dailyTasks = accountTasks.value.dailyTasks.filter(
          (task) => task.id !== id,
        )
      } else {
        accountTasks.value.weeklyTasks = accountTasks.value.weeklyTasks.filter(
          (task) => task.id !== id,
        )
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

  return {
    ensureCharProgress,
    resetAllCharacterPeriodProgress,
    refreshRampingWeeklyProgress,
    currentCharacterName,
    currentDailyTasks,
    currentWeeklyTasks,
    filteredDailyTasks,
    filteredWeeklyTasks,
    characterProgressOverview,
    accountProgressOverview,
    dailyDoneCount,
    dailyProgress,
    weeklyDoneCount,
    weeklyProgress,
    switchCharacter,
    switchCharacterFromDashboard,
    addNewCharacter,
    deleteCurrentCharacter,
    renameCharacter,
    renameCurrentCharacter,
    toggleTask,
    updateTask,
    setTaskNotes,
    incrementCount,
    decrementCount,
    addTask,
    addBlackHoleTask,
    loadPresetTemplates,
    deleteTask,
    resetDaily,
    resetWeekly,
  }
}
