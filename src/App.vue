<script setup>
import { useTaskManager } from './composables/useTaskManager'

// Initialize shared state, localStorage sync, and countdown timers once for all routes
useTaskManager()
</script>

<template>
  <RouterView />
</template>
