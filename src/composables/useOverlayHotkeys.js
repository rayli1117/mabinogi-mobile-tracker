import { ref, unref, onMounted, onUnmounted } from 'vue'

const HOTKEY_COUNT = 9

function shortcutForIndex(n) {
  return `CommandOrControl+${n}`
}

/**
 * Ctrl/Cmd+1..9 → complete or +1 the Nth incomplete overlay task.
 * Tauri: global shortcuts. Web: only while overlay document is focused.
 *
 * @param {import('vue').Ref|import('vue').ComputedRef|(() => any[])} incompleteTasks
 * @param {{ toggleTask: Function, incrementCount: Function }} actions
 */
export function useOverlayHotkeys(incompleteTasks, actions) {
  const lastHotkeyMessage = ref('')
  let messageTimer = null
  const registeredShortcuts = []
  let webListener = null

  function getTasks() {
    const value = typeof incompleteTasks === 'function' ? incompleteTasks() : unref(incompleteTasks)
    return Array.isArray(value) ? value : []
  }

  function showMessage(text) {
    lastHotkeyMessage.value = text
    if (messageTimer) clearTimeout(messageTimer)
    messageTimer = setTimeout(() => {
      lastHotkeyMessage.value = ''
      messageTimer = null
    }, 2000)
  }

  function applyHotkey(index1Based) {
    const tasks = getTasks()
    const task = tasks[index1Based - 1]
    if (!task) return

    if (task.maxCount) {
      actions.incrementCount(task)
      const next = (task.currentCount || 0)
      showMessage(`+1：${task.title}（${next}/${task.maxCount}）`)
    } else {
      actions.toggleTask(task)
      showMessage(`完成：${task.title}`)
    }
  }

  function onWebKeydown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
    if (event.repeat) return
    const match = /^Digit([1-9])$/.exec(event.code)
    if (!match) return
    event.preventDefault()
    applyHotkey(Number(match[1]))
  }

  onMounted(async () => {
    try {
      const { isTauri } = await import('@tauri-apps/api/core')
      if (isTauri()) {
        const { register, isRegistered, unregister } = await import(
          '@tauri-apps/plugin-global-shortcut'
        )

        for (let n = 1; n <= HOTKEY_COUNT; n++) {
          const shortcut = shortcutForIndex(n)
          if (await isRegistered(shortcut)) {
            await unregister(shortcut)
          }
          await register(shortcut, async (event) => {
            if (event.state !== 'Pressed') return
            applyHotkey(n)
          })
          registeredShortcuts.push(shortcut)
        }
        return
      }
    } catch (err) {
      console.warn('Overlay hotkey Tauri setup failed, falling back to web', err)
    }

    webListener = onWebKeydown
    window.addEventListener('keydown', webListener)
  })

  onUnmounted(async () => {
    if (messageTimer) {
      clearTimeout(messageTimer)
      messageTimer = null
    }

    if (webListener) {
      window.removeEventListener('keydown', webListener)
      webListener = null
    }

    if (registeredShortcuts.length === 0) return
    try {
      const { unregister } = await import('@tauri-apps/plugin-global-shortcut')
      for (const shortcut of registeredShortcuts) {
        try {
          await unregister(shortcut)
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.warn('Overlay hotkey cleanup failed', err)
    }
    registeredShortcuts.length = 0
  })

  return {
    lastHotkeyMessage,
    hotkeyCount: HOTKEY_COUNT,
  }
}
