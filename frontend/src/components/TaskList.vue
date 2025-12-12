<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="border-b border-[#333333] p-3">
      <h2 class="text-neon-blue font-bold text-lg">TDD Tasks</h2>
      <p class="text-gray-400 text-xs">Project: P-001 - TDD Team</p>
    </div>

    <!-- Task List -->
    <div class="flex-1 overflow-y-auto p-2">
      <div class="space-y-1">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="border border-[#333333] rounded p-2 hover:border-neon-blue transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-2 h-2 rounded-full mr-2" :class="task.statusColor"></div>
              <span class="text-sm font-medium text-gray-200">{{ task.title }}</span>
            </div>
            <div class="text-xs text-gray-500">{{ task.id }}</div>
          </div>
          <div class="mt-1 text-xs text-gray-400">{{ task.description }}</div>
          <div class="mt-2 flex justify-between items-center">
            <div class="text-xs text-gray-500">Status: {{ task.status }}</div>
            <div class="text-xs text-gray-500">{{ task.date }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Stats -->
    <div class="border-t border-[#333333] p-2 text-xs text-gray-400">
      <div class="flex justify-between">
        <div>Total: {{ tasks.length }} tasks</div>
        <div>Active: {{ activeTasksCount }}</div>
        <div>Completed: {{ completedTasksCount }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const tasks = ref([
  {
    id: 'P-001-T-001',
    title: 'Set up project structure',
    description: 'Create directories for backend, frontend, data, scripts',
    status: 'Completed',
    statusColor: 'bg-green-500',
    date: '2025-12-11'
  },
  {
    id: 'P-001-T-002',
    title: 'Install Express backend',
    description: 'Initialize npm and install express for the backend',
    status: 'Completed',
    statusColor: 'bg-green-500',
    date: '2025-12-11'
  },
  {
    id: 'P-001-T-003',
    title: 'Create JSON data files',
    description: 'Set up projects.json, tasks.json, conversations, and state_rules',
    status: 'Completed',
    statusColor: 'bg-green-500',
    date: '2025-12-11'
  },
  {
    id: 'P-001-T-004',
    title: 'Build Vue 3 frontend',
    description: 'Set up Vue 3 with Vite and Tailwind CSS',
    status: 'In Progress',
    statusColor: 'bg-yellow-500',
    date: '2025-12-11'
  },
  {
    id: 'P-001-T-005',
    title: 'Implement chat UI',
    description: 'Create chat panel with console aesthetics and auto-expanding input',
    status: 'In Progress',
    statusColor: 'bg-yellow-500',
    date: '2025-12-11'
  },
  {
    id: 'P-001-T-006',
    title: 'Connect to backend API',
    description: 'Establish WebSocket or REST connection for real-time chat',
    status: 'Pending',
    statusColor: 'bg-gray-500',
    date: '2025-12-12'
  },
  {
    id: 'P-001-T-007',
    title: 'Implement TDD automation',
    description: 'Create workflows for test-driven development with multiple agents',
    status: 'Pending',
    statusColor: 'bg-gray-500',
    date: '2025-12-12'
  }
])

const activeTasksCount = computed(() => {
  return tasks.value.filter(task => task.status === 'In Progress').length
})

const completedTasksCount = computed(() => {
  return tasks.value.filter(task => task.status === 'Completed').length
})
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
