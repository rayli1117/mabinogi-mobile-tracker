import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { alignRouteToWindow } from './composables/useOverlayWindow'

const app = createApp(App)
app.use(router)

alignRouteToWindow(router).finally(() => {
  app.mount('#app')
})
