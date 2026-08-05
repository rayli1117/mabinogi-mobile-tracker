import { createRouter, createWebHistory } from 'vue-router'
import MainView from './views/MainView.vue'
import OverlayView from './views/OverlayView.vue'

// Vite may set BASE_URL to './' under Tauri; History API needs an absolute base path.
const rawBase = import.meta.env.BASE_URL || '/'
const routerBase = rawBase === './' ? '/' : rawBase

const router = createRouter({
  history: createWebHistory(routerBase),
  routes: [
    { path: '/', name: 'main', component: MainView },
    { path: '/overlay', name: 'overlay', component: OverlayView },
  ],
})

export default router
