<script setup>
import { useTaskManager } from './composables/useTaskManager'
import AppHeader from './components/AppHeader.vue'
import CharacterBar from './components/CharacterBar.vue'
import CountdownTimer from './components/CountdownTimer.vue'
import TaskInput from './components/TaskInput.vue'
import TaskList from './components/TaskList.vue'
import ProgressDashboard from './components/ProgressDashboard.vue'

// Initialize shared state, localStorage sync, and countdown timers
useTaskManager()
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <AppHeader />
    <CharacterBar />
    <CountdownTimer />
    <TaskInput />
    <TaskList type="daily" />
    <TaskList type="weekly" />
    <ProgressDashboard />
  </div>
</template>
