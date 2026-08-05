/**
 * Open / focus the compact overlay companion window.
 * Web: browser popup. Tauri: native always-on-top WebviewWindow.
 */
export async function openOverlayWindow() {
  const { isTauri } = await import('@tauri-apps/api/core')
  if (!isTauri()) {
    const base = import.meta.env.BASE_URL || '/'
    const path = `${base}overlay`.replace(/\/{2,}/g, '/')
    const url = new URL(path, window.location.origin).href
    window.open(url, 'mmt-overlay', 'width=360,height=640,resizable=yes,scrollbars=yes')
    return
  }

  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const existing = await WebviewWindow.getByLabel('overlay')
  if (existing) {
    await existing.show()
    await existing.setFocus()
    return
  }

  const overlay = new WebviewWindow('overlay', {
    // Load SPA shell; App aligns route from window label (works in prod + dev).
    url: 'index.html',
    title: '任務 Overlay',
    width: 360,
    height: 640,
    decorations: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    visible: true,
  })

  overlay.once('tauri://error', (e) => {
    console.error('Failed to create overlay window', e)
  })
}

/**
 * If this Tauri window is the overlay label, force /overlay route (and vice versa).
 */
export async function alignRouteToWindow(router) {
  try {
    const { isTauri } = await import('@tauri-apps/api/core')
    if (!isTauri()) return

    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const label = getCurrentWindow().label
    const name = router.currentRoute.value.name

    if (label === 'overlay' && name !== 'overlay') {
      await router.replace({ name: 'overlay' })
    } else if (label === 'main' && name === 'overlay') {
      await router.replace({ name: 'main' })
    }
  } catch (err) {
    console.warn('alignRouteToWindow failed', err)
  }
}

export async function focusMainWindow() {
  try {
    const { isTauri } = await import('@tauri-apps/api/core')
    if (!isTauri()) return false

    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const main = await WebviewWindow.getByLabel('main')
    if (main) {
      await main.show()
      await main.setFocus()
      return true
    }
  } catch (err) {
    console.warn('focusMainWindow failed', err)
  }
  return false
}

export async function isRunningInTauri() {
  try {
    const { isTauri } = await import('@tauri-apps/api/core')
    return isTauri()
  } catch {
    return false
  }
}
