<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="border-b border-[#333333] p-3">
      <h2 class="text-neon-blue font-bold text-lg">TDD Tasks</h2>
      <p class="text-gray-400 text-xs">Project: P-001 - TDD Team</p>
    </div>

    <!-- Subtask Modal -->
    <div v-if="showSubtaskModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div class="bg-[#1a1a1a] border border-[#333333] rounded-lg w-3/4 min-w-[60%] h-[95vh] overflow-auto flex flex-col">
        <!-- Header -->
        <div class="flex justify-between items-start p-6 border-b border-[#333333] sticky top-0 bg-[#1a1a1a] z-10">
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="text-neon-blue font-bold text-2xl">{{ selectedSubtask.title }}</h3>
              <div class="flex space-x-4 text-sm text-gray-400">
                <div>Phase: <span class="text-gray-300 font-medium">{{ selectedPhaseInfo.id }}</span></div>
                <div>Task: <span class="text-gray-300 font-medium">{{ selectedTaskInfo.id }}</span></div>
                <div>Subtask: <span class="text-gray-300 font-medium">{{ selectedSubtask.id }}</span></div>
              </div>
            </div>
            <p class="text-gray-400 mt-2">{{ selectedSubtask.description }}</p>
          </div>
          <button 
            @click="closeSubtaskModal"
            class="text-gray-400 hover:text-white p-1 ml-4"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Main Content - Two Columns -->
        <div class="flex-1 overflow-hidden flex min-h-0">
          <!-- Left Column - Subtask Details -->
          <div class="w-1/2 border-r border-[#333333] p-6 overflow-y-auto">
            <div class="space-y-6">
              <!-- Basic Info -->
              <div>
                <h4 class="text-gray-300 font-medium mb-3 text-lg">Subtask Details</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <div>
                      <div class="text-gray-400 text-sm">Status</div>
                      <div class="flex items-center">
                        <div class="w-3 h-3 rounded-full mr-2" :class="getSubtaskStatusColor(selectedSubtask.status)"></div>
                        <span class="text-gray-300 capitalize">{{ selectedSubtask.status.replace('_', ' ') }}</span>
                      </div>
                    </div>
                    <div>
                      <div class="text-gray-400 text-sm">Assigned Agent</div>
                      <div class="text-gray-300">{{ selectedSubtask.agent || 'Unassigned' }}</div>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div>
                      <div class="text-gray-400 text-sm">Estimated Time</div>
                      <div class="text-gray-300">{{ selectedSubtask.estimated_time || 'Not specified' }}</div>
                    </div>
                    <div>
                      <div class="text-gray-400 text-sm">Last Updated</div>
                      <div class="text-gray-300">{{ formatDate(selectedSubtask.updated_at) }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Instructions -->
              <div v-if="selectedSubtask.instructions">
                <h4 class="text-gray-300 font-medium mb-2">Instructions</h4>
                <div class="space-y-3">
                  <div v-if="selectedSubtask.instructions.tara">
                    <div class="text-gray-400 text-sm">For Tara</div>
                    <div class="text-gray-300 text-sm bg-[#222222] p-2 rounded">{{ selectedSubtask.instructions.tara }}</div>
                  </div>
                  <div v-if="selectedSubtask.instructions.devon">
                    <div class="text-gray-400 text-sm">For Devon</div>
                    <div class="text-gray-300 text-sm bg-[#222222] p-2 rounded">{{ selectedSubtask.instructions.devon }}</div>
                  </div>
                  <div v-if="selectedSubtask.instructions.orion">
                    <div class="text-gray-400 text-sm">For Orion</div>
                    <div class="text-gray-300 text-sm bg-[#222222] p-2 rounded">{{ selectedSubtask.instructions.orion }}</div>
                  </div>
                </div>
              </div>

              <!-- Notes & Considerations -->
              <div v-if="selectedSubtask.notes || selectedSubtask.key_considerations?.length > 0">
                <h4 class="text-gray-300 font-medium mb-2">Notes & Considerations</h4>
                <div class="space-y-3">
                  <div v-if="selectedSubtask.notes">
                    <div class="text-gray-400 text-sm">Notes</div>
                    <div class="text-gray-300 text-sm bg-[#222222] p-2 rounded">{{ selectedSubtask.notes }}</div>
                  </div>
                  <div v-if="selectedSubtask.key_considerations?.length > 0">
                    <div class="text-gray-400 text-sm">Key Considerations</div>
                    <ul class="text-gray-300 text-sm space-y-1">
                      <li v-for="(consideration, index) in selectedSubtask.key_considerations" :key="index" class="bg-[#222222] p-2 rounded">
                        {{ consideration }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Dependencies -->
              <div v-if="selectedSubtask.dependencies?.length > 0">
                <h4 class="text-gray-300 font-medium mb-2">Dependencies</h4>
                <div class="flex flex-wrap gap-2">
                  <span v-for="dep in selectedSubtask.dependencies" :key="dep" class="px-2 py-1 bg-[#222222] text-gray-300 text-xs rounded">
                    {{ dep }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column - Activity Log -->
          <div class="w-1/2 flex flex-col min-h-0">
            <!-- Activity Log Header -->
            <div class="border-b border-[#333333] p-4 sticky top-0 bg-[#1a1a1a] z-10">
              <div class="flex justify-between items-center">
                <h4 class="text-gray-300 font-medium text-lg">Activity Log</h4>
                <div class="flex space-x-2">
                  <!-- Type Filter -->
                  <select v-model="activityTypeFilter" class="bg-[#222222] text-gray-300 border border-[#333333] rounded px-2 py-1 text-sm">
                    <option value="all">All Types</option>
                    <option value="clarification_question">Questions</option>
                    <option value="progress_update">Updates</option>
                    <option value="test_result">Tests</option>
                    <option value="escalation">Escalations</option>
                    <option value="general">General</option>
                  </select>
                  <!-- Status Filter -->
                  <select v-model="activityFilter" class="bg-[#222222] text-gray-300 border border-[#333333] rounded px-2 py-1 text-sm">
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="answered">Answered</option>
                    <option value="resolved">Resolved</option>
                    <option value="escalated">Escalated</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Activity Log Content -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <div v-if="!selectedSubtask.activity_log || selectedSubtask.activity_log.length === 0" class="text-gray-500 text-center py-8">
                No activity yet. Be the first to comment!
              </div>
              
              <div v-else v-for="activity in filteredActivityLog" :key="activity.id" 
                   :class="['p-3 rounded border', activity.parent_id ? 'ml-6 border-[#333333]' : 'border-[#444444]']">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <div class="flex items-center space-x-1">
                      <div class="w-2 h-2 rounded-full" :class="getActivityTypeColor(activity.type)"></div>
                      <span class="text-xs text-gray-400">{{ formatActivityType(activity.type) }}</span>
                    </div>
                    <div class="w-2 h-2 rounded-full" :class="getActivityStatusColor(activity.status)"></div>
                    <span class="text-xs text-gray-400 capitalize">{{ activity.status }}</span>
                  </div>
                  <span class="text-xs text-gray-500">{{ formatDate(activity.timestamp) }}</span>
                </div>
                <div class="mb-2">
                  <span class="text-sm text-gray-300 font-medium">{{ activity.agent }}:</span>
                  <span class="text-sm text-gray-300 ml-1">{{ activity.content }}</span>
                </div>
                <div v-if="activity.metadata && Object.keys(activity.metadata).length > 0" class="text-xs text-gray-500 mb-2">
                  <div v-for="(value, key) in activity.metadata" :key="key">
                    {{ key }}: {{ value }}
                  </div>
                </div>
                <div v-if="activity.attachments?.length > 0" class="text-xs text-gray-500 mb-2">
                  Attachments: {{ activity.attachments.join(', ') }}
                </div>
                <button 
                  v-if="activity.type === 'clarification_question' && activity.status === 'open'"
                  @click="replyToActivity(activity.id)"
                  class="text-xs text-neon-blue hover:text-neon-blue-light"
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Input Section (Above Footer Buttons) -->
        <div class="border-t border-[#333333] p-4">
          <form @submit.prevent="addActivity">
            <div class="flex items-end space-x-2">
              <!-- Activity Type Selector -->
              <select 
                v-model="newActivityType"
                class="bg-[#222222] text-gray-300 border border-[#333333] rounded px-2 py-1 text-sm"
              >
                <option value="general">General</option>
                <option value="clarification_question">Question</option>
                <option value="progress_update">Update</option>
                <option value="test_result">Test Result</option>
                <option value="escalation">Escalation</option>
              </select>
              
              <!-- Textarea -->
              <textarea
                ref="activityTextarea"
                v-model="newActivityMessage"
                @keydown.enter.exact.prevent="addActivity"
                @keydown.shift.enter.prevent="addNewLine"
                @input="onTextareaInput"
                placeholder="Type your message... (Shift+Enter for new line)"
                class="activity-textarea flex-1 bg-[#222222] text-gray-300 placeholder-gray-500 border border-[#333333] rounded px-2 py-1 text-sm resize-none auto-expand focus:outline-none focus:border-neon-blue"
                rows="1"
              />
              
              <!-- Send Button -->
              <button
                type="submit"
                :disabled="sendingActivity || !newActivityMessage.trim()"
                class="bg-[#333333] text-neon-blue hover:bg-[#444444] px-4 py-2 rounded text-sm font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ sendingActivity ? 'Sending...' : 'Send' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Footer Buttons -->
        <div class="border-t border-[#333333] p-4 flex justify-between">
          <div class="text-xs text-gray-500">
            {{ filteredActivityLog.length }} activity entries
          </div>
          <div class="flex space-x-2">
            <button 
              @click="closeSubtaskModal"
              class="px-4 py-2 text-sm border border-[#333333] text-gray-300 hover:bg-[#222222] rounded"
            >
              Close
            </button>
            <button 
              @click="markSubtaskComplete"
              v-if="selectedSubtask.status !== 'completed'"
              class="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded"
            >
              Mark Complete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-neon-blue">Loading project data...</div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-red-500">Error: {{ error }}</div>
    </div>

    <!-- Task List -->
    <div v-else class="flex-1 overflow-y-auto p-2">
      <div class="space-y-3">
        <!-- Phase collapsible sections -->
        <div v-for="phase in phases" :key="phase.id" class="border border-[#333333] rounded">
          <!-- Phase header -->
          <div 
            class="flex items-center justify-between p-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
            @click="togglePhase(phase.id)"
          >
            <div class="flex items-center">
              <div class="w-2 h-2 rounded-full mr-2" :class="getPhaseStatusColor(phase.status)"></div>
              <span class="font-medium text-gray-200">{{ phase.title }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-xs px-2 py-1 rounded bg-[#333333] text-gray-300">{{ getTaskCount(phase.id) }} tasks</span>
              <svg 
                class="w-4 h-4 text-gray-400 transition-transform" 
                :class="{ 'rotate-180': expandedPhases[phase.id] }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          <!-- Phase content (collapsible) -->
          <div v-if="expandedPhases[phase.id]" class="border-t border-[#333333] p-3">
            <p class="text-sm text-gray-400 mb-3">{{ phase.description }}</p>
            
            <!-- Tasks in this phase -->
            <div class="space-y-2">
              <div 
                v-for="task in getTasksForPhase(phase.id)" 
                :key="task.id"
                class="border border-[#444444] rounded p-3 hover:border-neon-blue transition-colors"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <div class="w-2 h-2 rounded-full mr-2" :class="getTaskStatusColor(task.status)"></div>
                    <span class="text-sm font-medium text-gray-200">{{ task.title }}</span>
                  </div>
                  <div class="text-xs text-gray-500">{{ task.id }}</div>
                </div>
                <div class="mt-1 text-xs text-gray-400">{{ task.description }}</div>
                
                <!-- Subtasks (if any) -->
                <div v-if="getSubtasksForTask(task.id).length > 0" class="mt-2">
                  <div class="text-xs text-gray-500 mb-1">Subtasks:</div>
                  <div class="space-y-1 ml-2">
                    <div 
                      v-for="subtask in getSubtasksForTask(task.id)" 
                      :key="subtask.id"
                      @click="openSubtaskModal(phase.id, task.id, subtask.id)"
                      class="flex items-center justify-between text-xs p-1 hover:bg-[#222222] rounded cursor-pointer"
                    >
                      <div class="flex items-center">
                        <div class="w-1.5 h-1.5 rounded-full mr-2" :class="getSubtaskStatusColor(subtask.status)"></div>
                        <span class="text-gray-300">{{ subtask.title }}</span>
                      </div>
                      <div class="text-gray-500 text-xs">{{ subtask.agent }}</div>
                    </div>
                  </div>
                </div>

                <div class="mt-2 flex justify-between items-center">
                  <div class="text-xs text-gray-500">Status: {{ task.status }}</div>
                  <div class="text-xs text-gray-500">{{ getTaskAgent(task.id) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Stats -->
    <div class="border-t border-[#333333] p-2 text-xs text-gray-400">
      <div class="flex justify-between">
        <div>Phases: {{ phases.length }}</div>
        <div>Tasks: {{ totalTasks }}</div>
        <div>Subtasks: {{ totalSubtasks }}</div>
        <div>Active: {{ activePhasesCount }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Reactive data
const loading = ref(true)
const error = ref(null)
const projectData = ref({ phases: [], tasks: {}, subtasks: {} })
const expandedPhases = ref({})
const showSubtaskModal = ref(false)
const selectedSubtask = ref(null)
const selectedTaskInfo = ref(null)
const selectedPhaseInfo = ref(null)

// Fetch project data on mount
onMounted(async () => {
  try {
    const response = await fetch('http://localhost:3000/api/project')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    projectData.value = data
    
    // Expand active phase by default
    data.phases.forEach(phase => {
      if (phase.status === 'active') {
        expandedPhases.value[phase.id] = true
      }
    })
  } catch (err) {
    console.error('Failed to fetch project data:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
})

// Computed properties
const phases = computed(() => projectData.value.phases || [])
const tasks = computed(() => projectData.value.tasks || {})
const subtasks = computed(() => projectData.value.subtasks || {})

const totalTasks = computed(() => Object.keys(tasks.value).length)
const totalSubtasks = computed(() => Object.keys(subtasks.value).length)

const activePhasesCount = computed(() => {
  return phases.value.filter(phase => phase.status === 'active').length
})

// Methods
const togglePhase = (phaseId) => {
  expandedPhases.value[phaseId] = !expandedPhases.value[phaseId]
}

const getTasksForPhase = (phaseId) => {
  return Object.values(tasks.value).filter(task => task.phase_id === phaseId)
}

const getSubtasksForTask = (taskId) => {
  return Object.values(subtasks.value).filter(subtask => subtask.task_id === taskId)
}

const getTaskCount = (phaseId) => {
  return getTasksForPhase(phaseId).length
}

const getTaskAgent = (taskId) => {
  const taskSubtasks = getSubtasksForTask(taskId)
  if (taskSubtasks.length === 0) return 'No agent'
  // Return the most common agent or first agent
  const agents = taskSubtasks.map(st => st.agent).filter(Boolean)
  if (agents.length === 0) return 'No agent'
  return agents[0]
}

// Modal methods
const openSubtaskModal = async (phaseId, taskId, subtaskId) => {
  // Find the phase and task from local data
  const phase = phases.value.find(p => p.id === phaseId)
  const task = tasks.value[taskId]
  
  if (phase && task) {
    selectedPhaseInfo.value = phase
    selectedTaskInfo.value = task
    showSubtaskModal.value = true
    
    // Fetch full subtask details from backend
    try {
      const response = await fetch(`http://localhost:3000/api/subtask/${subtaskId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const fullSubtask = await response.json()
      selectedSubtask.value = fullSubtask
      
      // Initialize activity log filters
      activityFilter.value = 'all'
      activityTypeFilter.value = 'all'
    } catch (err) {
      console.error('Failed to fetch subtask details:', err)
      // Fallback to lightweight data if available
      selectedSubtask.value = subtasks.value[subtaskId] || {}
    }
  }
}

const closeSubtaskModal = () => {
  showSubtaskModal.value = false
  selectedSubtask.value = null
  selectedTaskInfo.value = null
  selectedPhaseInfo.value = null
  newActivityMessage.value = ''
  newActivityType.value = 'general'
  activityFilter.value = 'all'
  activityTypeFilter.value = 'all'
}

const markSubtaskComplete = () => {
  if (selectedSubtask.value) {
    // In a real app, you would make an API call to update the subtask status
    console.log(`Marking subtask ${selectedSubtask.value.id} as completed`)
    // For now, just update locally
    selectedSubtask.value.status = 'completed'
    // Close the modal
    closeSubtaskModal()
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

// Activity log methods
const activityFilter = ref('all') // 'all', 'open', 'answered', 'resolved'
const activityTypeFilter = ref('all') // 'all', 'clarification_question', 'progress_update', 'test_result', 'escalation', 'general'
const newActivityMessage = ref('')
const newActivityType = ref('general')
const sendingActivity = ref(false)

// Computed filtered activity log
const filteredActivityLog = computed(() => {
  if (!selectedSubtask.value || !selectedSubtask.value.activity_log) {
    return []
  }
  
  let filtered = [...selectedSubtask.value.activity_log]
  
  // Filter by status
  if (activityFilter.value !== 'all') {
    filtered = filtered.filter(activity => activity.status === activityFilter.value)
  }
  
  // Filter by type
  if (activityTypeFilter.value !== 'all') {
    filtered = filtered.filter(activity => activity.type === activityTypeFilter.value)
  }
  
  // Sort by timestamp (newest first)
  return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

// Add new activity
const addActivity = async () => {
  if (!newActivityMessage.value.trim() || !selectedSubtask.value) return
  
  sendingActivity.value = true
  try {
    const response = await fetch(`http://localhost:3000/api/subtask/${selectedSubtask.value.id}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: newActivityType.value,
        agent: 'User', // In a real app, this would be the logged-in user
        content: newActivityMessage.value.trim(),
        status: newActivityType.value === 'clarification_question' ? 'open' : 'resolved'
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    
    // Refresh subtask data
    const refreshResponse = await fetch(`http://localhost:3000/api/subtask/${selectedSubtask.value.id}`)
    if (refreshResponse.ok) {
      selectedSubtask.value = await refreshResponse.json()
    }
    
    // Clear input
    newActivityMessage.value = ''
    newActivityType.value = 'general'
  } catch (err) {
    console.error('Failed to add activity:', err)
  } finally {
    sendingActivity.value = false
  }
}

// Reply to an activity
const replyToActivity = async (activityId) => {
  if (!newActivityMessage.value.trim() || !selectedSubtask.value) return
  
  sendingActivity.value = true
  try {
    const response = await fetch(`http://localhost:3000/api/subtask/${selectedSubtask.value.id}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'general',
        agent: 'User',
        content: newActivityMessage.value.trim(),
        parent_id: activityId,
        status: 'answered'
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    // Refresh subtask data
    const refreshResponse = await fetch(`http://localhost:3000/api/subtask/${selectedSubtask.value.id}`)
    if (refreshResponse.ok) {
      selectedSubtask.value = await refreshResponse.json()
    }
    
    // Clear input
    newActivityMessage.value = ''
  } catch (err) {
    console.error('Failed to add reply:', err)
  } finally {
    sendingActivity.value = false
  }
}

// Get activity badge color based on type
const getActivityTypeColor = (type) => {
  switch (type) {
    case 'clarification_question': return 'bg-blue-500'
    case 'progress_update': return 'bg-green-500'
    case 'test_result': return 'bg-purple-500'
    case 'escalation': return 'bg-red-500'
    case 'general': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}

// Get activity status color
const getActivityStatusColor = (status) => {
  switch (status) {
    case 'open': return 'bg-yellow-500'
    case 'answered': return 'bg-green-500'
    case 'resolved': return 'bg-blue-500'
    case 'escalated': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

// Format activity type for display
const formatActivityType = (type) => {
  return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Textarea auto-expand (similar to ChatPanel)
const adjustTextareaHeight = (textarea) => {
  if (!textarea) return
  textarea.style.height = 'auto'
  const maxHeight = 4.5 * 16 // 4.5rem in px (approx 3 lines)
  const newHeight = Math.min(textarea.scrollHeight, maxHeight)
  textarea.style.height = `${newHeight}px`
}

const onTextareaInput = (event) => {
  adjustTextareaHeight(event.target)
}

const addNewLine = () => {
  newActivityMessage.value += '\n'
  // Manually trigger height adjustment on next tick
  nextTick(() => {
    const textarea = document.querySelector('.activity-textarea')
    if (textarea) adjustTextareaHeight(textarea)
  })
}

// Status color helpers
const getPhaseStatusColor = (status) => {
  switch (status) {
    case 'active': return 'bg-yellow-500'
    case 'completed': return 'bg-green-500'
    default: return 'bg-gray-500'
  }
}

const getTaskStatusColor = (status) => {
  switch (status) {
    case 'in_progress': return 'bg-yellow-500'
    case 'completed': return 'bg-green-500'
    case 'pending': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}

const getSubtaskStatusColor = (status) => {
  switch (status) {
    case 'completed': return 'bg-green-500'
    case 'in_progress': return 'bg-yellow-500'
    case 'pending': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
