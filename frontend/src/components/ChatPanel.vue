<template>
  <div class="h-full flex flex-col">
    <!-- Project Controls -->
    <div class="flex items-center justify-between border-b border-[#333333] p-2">
      <div class="flex items-center space-x-2">
        <!-- Project Selector -->
        <div class="flex items-center">
          <span class="text-sm text-gray-400 mr-2">Project:</span>
          <select
            v-model="selectedProjectId"
            class="bg-[#222222] text-neon-blue border border-[#333333] rounded px-2 py-1 text-sm focus:outline-none focus:border-neon-blue"
            @change="onProjectChange"
          >
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
        
        <!-- Task Selector (optional) -->
        <div class="flex items-center" v-if="tasks.length > 0">
          <span class="text-sm text-gray-400 ml-2 mr-2">Task:</span>
          <select
            v-model="selectedTaskId"
            class="bg-[#222222] text-neon-blue border border-[#333333] rounded px-2 py-1 text-sm focus:outline-none focus:border-neon-blue"
          >
            <option value="">None</option>
            <option v-for="task in tasks" :key="task.id" :value="task.id">
              {{ task.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Messages Container -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-2 space-y-1">
      <div v-for="(message, index) in messages" :key="index" class="flex">
        <div
          class="w-full rounded px-2 py-1 text-sm break-words whitespace-pre-wrap"
          :class="message.role === 'user' ? 'bg-[#333333] text-gray-200' : 'bg-black text-neon-blue'"
        >
          <span v-if="message.role === 'ai' && message.contentType === 'json'">
            {{ formatJsonMessage(message.content) }}
          </span>
          <span v-else>
            {{ message.content }}
          </span>
        </div>
      </div>
    </div>

    <!-- Input Area with Plan/Act Toggle -->
    <div class="border-t border-[#333333] p-2">
      <form @submit.prevent="sendMessage">
        <div class="flex items-end">
          <!-- Plan/Act Toggle -->
          <div class="flex border border-[#333333] rounded overflow-hidden mr-2">
            <button
              @click="currentMode = 'plan'"
              class="px-3 py-1 text-sm font-medium transition-colors"
              :class="currentMode === 'plan' ? 'neon-blue-bg text-black' : 'bg-[#222222] text-gray-400'"
            >
              Plan
            </button>
            <button
              @click="currentMode = 'act'"
              class="px-3 py-1 text-sm font-medium transition-colors"
              :class="currentMode === 'act' ? 'neon-pink-bg text-black' : 'bg-[#222222] text-gray-400'"
            >
              Act
            </button>
          </div>

          <textarea
            ref="textareaRef"
            v-model="inputText"
            @keydown.enter.exact.prevent="sendMessage"
            @keydown.shift.enter.prevent="addNewLine"
            @input="adjustTextareaHeight"
            placeholder="Type your message... (Shift+Enter for new line)"
            class="flex-1 bg-[#222222] text-neon-blue placeholder-gray-500 border border-[#333333] rounded px-2 py-1 text-sm resize-none auto-expand focus:outline-none focus:border-neon-blue"
            rows="1"
          />
          <button
            type="submit"
            :disabled="sending"
            class="ml-2 bg-[#333333] text-neon-blue hover:bg-[#444444] px-3 py-1 rounded text-sm font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ sending ? 'Sending...' : 'Send' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

// State
const messages = ref([
  { role: 'ai', content: 'Welcome to TDD Team Console. Ready to automate your workflow?', contentType: 'text' },
])
const inputText = ref('')
const textareaRef = ref(null)
const messagesContainer = ref(null)
const sending = ref(false)

// Project and Task state
const projects = ref([
  { id: 'P-001', name: 'Project P-001' }
])
const tasks = ref([])
const selectedProjectId = ref('P-001')
const selectedTaskId = ref('')

// Mode state
const currentMode = ref('plan')

// Polling
let pollInterval = null
const POLL_INTERVAL = 10000 // 10 seconds

// Format JSON messages for display
function formatJsonMessage(jsonString) {
  try {
    const parsed = JSON.parse(jsonString)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return jsonString
  }
}

// Textarea auto-expand
const adjustTextareaHeight = () => {
  nextTick(() => {
    const textarea = textareaRef.value
    if (!textarea) return
    textarea.style.height = 'auto'
    const maxHeight = 4.5 * 16 // 4.5rem in px (approx 3 lines)
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`
  })
}

const addNewLine = () => {
  inputText.value += '\n'
  adjustTextareaHeight()
}

// Scroll to bottom of messages
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Send message to backend
const sendMessage = async () => {
  if (!inputText.value.trim() || sending.value) return

  const userMessage = inputText.value.trim()
  inputText.value = ''
  adjustTextareaHeight()

  // Add user message to UI immediately
  messages.value.push({
    role: 'user',
    content: userMessage,
    contentType: 'text'
  })
  scrollToBottom()

  sending.value = true

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        projectId: selectedProjectId.value,
        taskId: selectedTaskId.value || null,
        mode: currentMode.value
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }

    const data = await response.json()
    
    // Add AI response to UI
    messages.value.push({
      role: 'ai',
      content: JSON.stringify(data, null, 2),
      contentType: 'json'
    })
  } catch (error) {
    console.error('Error sending message:', error)
    messages.value.push({
      role: 'ai',
      content: `Error: ${error.message}. Please check backend connection.`,
      contentType: 'text'
    })
  } finally {
    sending.value = false
    scrollToBottom()
  }
}

// Poll for updates
const pollForUpdates = async () => {
  try {
    const response = await fetch(`http://localhost:3000/api/poll/${selectedProjectId.value}${selectedTaskId.value ? `/${selectedTaskId.value}` : ''}`)
    if (!response.ok) return
    
    const data = await response.json()
    
    // Merge new messages into the UI
    if (data.messages && data.messages.length > 0) {
      // Create a Set of existing message timestamps for deduplication
      const existingTimestamps = new Set(messages.value.map(msg => msg.timestamp))
      
      // Add new messages that we don't already have
      data.messages.forEach(newMsg => {
        if (!existingTimestamps.has(newMsg.timestamp)) {
          // Convert backend message format to frontend format
          const formattedMsg = {
            role: newMsg.role === 'user' ? 'user' : 'ai',
            content: newMsg.content,
            contentType: newMsg.role === 'assistant' ? 'json' : 'text',
            timestamp: newMsg.timestamp
          }
          messages.value.push(formattedMsg)
        }
      })
      
      // If we added any new messages, scroll to bottom
      if (messages.value.length > 0) {
        scrollToBottom()
      }
    }
    
    // Log successful polling (optional)
    console.log('Polling successful', data.timestamp)
  } catch (error) {
    // Silently fail for polling errors
    console.error('Polling error:', error)
  }
}

// Load projects and tasks from API
const loadProjectsAndTasks = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/projects')
    if (!response.ok) return
    
    const data = await response.json()
    projects.value = data.projects.length > 0 ? data.projects : [{ id: 'P-001', name: 'Project P-001' }]
    tasks.value = data.tasks
    
    // Set default project if none selected
    if (!selectedProjectId.value && projects.value.length > 0) {
      selectedProjectId.value = projects.value[0].id
    }
  } catch (error) {
    console.error('Error loading projects:', error)
  }
}

// Handle project change
const onProjectChange = () => {
  // When project changes, clear task selection and reload tasks for that project
  selectedTaskId.value = ''
  loadProjectsAndTasks()
}

// Lifecycle
onMounted(() => {
  adjustTextareaHeight()
  scrollToBottom()
  
  // Load initial projects and tasks
  loadProjectsAndTasks()
  
  // Start polling
  pollInterval = setInterval(pollForUpdates, POLL_INTERVAL)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})

// Watch for mode changes (optional visual feedback)
watch(currentMode, (newMode) => {
  console.log(`Mode changed to ${newMode}`)
})
</script>

<style scoped>
.auto-expand {
  max-height: 4.5rem; /* 3 lines */
  overflow-y: auto;
}

.neon-blue-bg {
  background-color: #00ffff;
  color: #000;
}

.neon-pink-bg {
  background-color: #ff00ff;
  color: #000;
}

/* Custom scrollbar for messages */
.messages-container {
  scrollbar-width: thin;
  scrollbar-color: #333333 #222222;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #222222;
}

.messages-container::-webkit-scrollbar-thumb {
  background-color: #333333;
  border-radius: 3px;
}
</style>
