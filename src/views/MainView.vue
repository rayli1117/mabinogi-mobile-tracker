<script setup>
import AppHeader from '../components/AppHeader.vue'
import TaskInput from '../components/TaskInput.vue'
import TaskList from '../components/TaskList.vue'
import ProgressDashboard from '../components/ProgressDashboard.vue'
import ImportExportDialog from '../components/ImportExportDialog.vue'
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-4">
    <AppHeader />
    <TaskInput />
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <TaskList type="daily" />
      <TaskList type="weekly" />
    </div>
    <ProgressDashboard />
    <ImportExportDialog />
  </div>
</template>
