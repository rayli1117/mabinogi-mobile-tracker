import { createRouter, createWebHistory } from 'vue-router'
import MainView from './views/MainView.vue'
import OverlayView from './views/OverlayView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'main', component: MainView },
    { path: '/overlay', name: 'overlay', component: OverlayView },
  ],
})

export default router
