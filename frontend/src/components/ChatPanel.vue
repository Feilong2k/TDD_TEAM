<template>
  <div class="h-full flex flex-col">
    <!-- Messages Container -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div v-for="(message, index) in messages" :key="index" class="flex">
        <div
          class="w-full rounded px-2 py-1 text-sm break-words whitespace-pre-wrap"
          :class="message.role === 'user' ? 'bg-[#333333] text-gray-200' : 'bg-black text-neon-blue'"
        >
          {{ message.content }}
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="border-t border-[#333333] p-2">
      <form @submit.prevent="sendMessage">
        <div class="flex items-end">
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
            class="ml-2 bg-[#333333] text-neon-blue hover:bg-[#444444] px-3 py-1 rounded text-sm font-medium focus:outline-none"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const messages = ref([
  { role: 'ai', content: 'Welcome to TDD Team Console. Ready to automate your workflow?' },
  { role: 'user', content: 'Initialize project structure' },
  { role: 'ai', content: 'Project structure created. Backend set up with Express.' },
])

const inputText = ref('')
const textareaRef = ref(null)

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

const sendMessage = () => {
  if (!inputText.value.trim()) return

  messages.value.push({
    role: 'user',
    content: inputText.value.trim()
  })

  // Simulate AI response after a short delay
  setTimeout(() => {
    messages.value.push({
      role: 'ai',
      content: `Received: "${inputText.value.trim()}"`
    })
  }, 500)

  inputText.value = ''
  adjustTextareaHeight()
}

onMounted(() => {
  adjustTextareaHeight()
})
</script>

<style scoped>
.auto-expand {
  max-height: 4.5rem; /* 3 lines */
  overflow-y: auto;
}
</style>
