import { ref } from 'vue'

const SPAWN_SCHEDULES = {
  p_cw4: {
    type: 'dailyTimes',
    times: [
      [12, 0],
      [18, 0],
      [20, 0],
      [22, 0],
    ],
    label: '野外首領',
    shortLabel: '野外首領',
  },
  p_cw6: {
    type: 'hourlyMinutes',
    minutes: [0],
    label: '不祥的召喚結界',
    shortLabel: '召喚結界',
  },
  p_cw7: {
    type: 'hourlyMinutes',
    minutes: [13, 43],
    label: '黑色坑洞',
    shortLabel: '黑色坑洞',
  },
}

const SPAWN_COUNTDOWN_TASK_IDS = ['p_cw4', 'p_cw6', 'p_cw7']

export function getGameAdjustedDate(date = new Date()) {
  const d = new Date(date)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  return d
}

/** Mon=1 … Sun=7, using the app's 06:00 day boundary. */
export function getMondayBasedDayIndex(date = new Date()) {
  const day = getGameAdjustedDate(date).getDay()
  return day === 0 ? 7 : day
}

export function getCustomDateString(date = new Date()) {
  const d = new Date(date)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getCustomWeekKey(date = new Date()) {
  const d = new Date(date)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${weekNo < 10 ? '0' + weekNo : weekNo}`
}

function formatHms(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (num) => String(num).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function getNextSpawnDate(schedule, now = new Date()) {
  if (!schedule) return null

  if (schedule.type === 'dailyTimes') {
    const candidates = []
    for (const [hour, minute] of schedule.times) {
      const t = new Date(now)
      t.setHours(hour, minute, 0, 0)
      if (t > now) candidates.push(t)
    }
    if (candidates.length > 0) {
      return candidates.sort((a, b) => a - b)[0]
    }
    const [hour, minute] = schedule.times[0]
    const next = new Date(now)
    next.setDate(next.getDate() + 1)
    next.setHours(hour, minute, 0, 0)
    return next
  }

  if (schedule.type === 'hourlyMinutes') {
    const minutes = [...schedule.minutes].sort((a, b) => a - b)
    const hourStart = new Date(now)
    hourStart.setMinutes(0, 0, 0)

    for (let hourOffset = 0; hourOffset <= 24; hourOffset++) {
      for (const minute of minutes) {
        const t = new Date(hourStart)
        t.setHours(hourStart.getHours() + hourOffset)
        t.setMinutes(minute, 0, 0)
        if (t > now) return t
      }
    }
  }

  return null
}

export function getNextSpawnCountdown(taskId, now = new Date()) {
  const schedule = SPAWN_SCHEDULES[taskId]
  if (!schedule) return null
  const nextAt = getNextSpawnDate(schedule, now)
  if (!nextAt) return null
  const ms = Math.max(0, nextAt - now)
  return {
    taskId,
    label: schedule.label,
    shortLabel: schedule.shortLabel || schedule.label,
    nextAt,
    ms,
    text: formatHms(ms),
  }
}

/**
 * @param {{ lastDate: import('vue').Ref<string>, lastWeekKey: import('vue').Ref<string>, accountTasks: import('vue').Ref<any> }} state
 * @param {{
 *   loadData: (options?: object) => void,
 *   resetAllCharacterPeriodProgress: (period: string) => void,
 *   refreshRampingWeeklyProgress: () => void,
 *   resetTaskProgress: (task: object) => void,
 * }} deps
 */
export function createGameClock(state, deps) {
  const { lastDate, lastWeekKey, accountTasks } = state
  const dailyCountdownText = ref('00:00:00')
  const weeklyCountdownText = ref('0天 00:00:00')
  const spawnCountdowns = ref([])

  let timer = null

  function applyPeriodResets(needDaily, needWeekly) {
    if (needDaily) {
      deps.resetAllCharacterPeriodProgress('daily')
      if (accountTasks.value.dailyTasks) {
        accountTasks.value.dailyTasks.forEach(deps.resetTaskProgress)
      }
      deps.refreshRampingWeeklyProgress()
    }
    if (needWeekly) {
      deps.resetAllCharacterPeriodProgress('weekly')
      if (accountTasks.value.weeklyTasks) {
        accountTasks.value.weeklyTasks.forEach(deps.resetTaskProgress)
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

  function checkPeriodReset() {
    const todayKey = getCustomDateString()
    const currentWeekKey = getCustomWeekKey()
    if (todayKey !== lastDate.value || currentWeekKey !== lastWeekKey.value) {
      deps.loadData()
    }
  }

  function updateDailyCountdown() {
    const now = new Date()
    const target = new Date()
    target.setHours(6, 0, 0, 0)
    if (now >= target) target.setDate(target.getDate() + 1)

    dailyCountdownText.value = formatHms(target - now)
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

    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (num) => String(num).padStart(2, '0')
    weeklyCountdownText.value = `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  function updateSpawnCountdowns() {
    const now = new Date()
    spawnCountdowns.value = SPAWN_COUNTDOWN_TASK_IDS.map((taskId) =>
      getNextSpawnCountdown(taskId, now),
    ).filter(Boolean)
  }

  function updateAllCountdowns() {
    checkPeriodReset()
    updateDailyCountdown()
    updateWeeklyCountdown()
    updateSpawnCountdowns()
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      checkPeriodReset()
      updateDailyCountdown()
      updateWeeklyCountdown()
      updateSpawnCountdowns()
    }
  }

  function startClock() {
    updateAllCountdowns()
    timer = setInterval(updateAllCountdowns, 1000)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  function stopClock() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  return {
    dailyCountdownText,
    weeklyCountdownText,
    spawnCountdowns,
    getNextSpawnCountdown,
    getCustomDateString,
    getCustomWeekKey,
    getMondayBasedDayIndex,
    applyPeriodResets,
    ensurePeriodCurrent,
    checkPeriodReset,
    updateAllCountdowns,
    handleVisibilityChange,
    startClock,
    stopClock,
  }
}
