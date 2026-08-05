import { ref, onMounted, onUnmounted } from 'vue'

const F8_SHORTCUT = 'F8'

/**
 * Tauri-only: toggle setIgnoreCursorEvents so the game receives clicks.
 * Registers global F8 while the overlay view is mounted.
 */
export function useClickThrough() {
  const clickThrough = ref(false)
  const isTauri = ref(false)
  let shortcutRegistered = false

  async function applyIgnore(ignore) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().setIgnoreCursorEvents(ignore)
    clickThrough.value = ignore
  }

  async function setClickThrough(ignore) {
    if (!isTauri.value) return
    await applyIgnore(!!ignore)
  }

  async function toggleClickThrough() {
    await setClickThrough(!clickThrough.value)
  }

  onMounted(async () => {
    try {
      const { isTauri: checkTauri } = await import('@tauri-apps/api/core')
      if (!checkTauri()) return
      isTauri.value = true

      const { register, isRegistered, unregister } = await import(
        '@tauri-apps/plugin-global-shortcut'
      )

      if (await isRegistered(F8_SHORTCUT)) {
        await unregister(F8_SHORTCUT)
      }

      await register(F8_SHORTCUT, async (event) => {
        if (event.state !== 'Pressed') return
        await toggleClickThrough()
      })
      shortcutRegistered = true
    } catch (err) {
      console.warn('Click-through setup failed', err)
    }
  })

  onUnmounted(async () => {
    if (!isTauri.value) return
    try {
      if (clickThrough.value) {
        await applyIgnore(false)
      }
      if (shortcutRegistered) {
        const { unregister } = await import('@tauri-apps/plugin-global-shortcut')
        await unregister(F8_SHORTCUT)
        shortcutRegistered = false
      }
    } catch (err) {
      console.warn('Click-through cleanup failed', err)
    }
  })

  return {
    isTauri,
    clickThrough,
    toggleClickThrough,
    setClickThrough,
  }
}
