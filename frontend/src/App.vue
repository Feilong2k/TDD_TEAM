<template>
  <div class="flex h-screen bg-black text-neon-blue font-mono">
    <!-- Chat Panel (Left) -->
    <div class="w-1/2 bg-[#111111] border-r border-[#333333] overflow-hidden flex flex-col">
      <ChatPanel />
    </div>

    <!-- Task List (Right) -->
    <div class="w-1/2 bg-[#0a0a0a] overflow-hidden flex flex-col">
      <TaskList />
    </div>
  </div>
</template>

<script setup>
import ChatPanel from './components/ChatPanel.vue'
import TaskList from './components/TaskList.vue'
</script>
