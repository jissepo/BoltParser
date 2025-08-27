<script setup lang="ts">
import type { TFilesWithObjectUrl } from '@/Types/types'
import { useFileDialog } from '@vueuse/core'
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'next', files: TFilesWithObjectUrl[]): void
}>()

const { open, reset, onChange } = useFileDialog({
  accept: 'image/*', // Set to accept only image files
  multiple: true, // Allow multiple file selection
})

const filesWithObjectUrl = ref<TFilesWithObjectUrl[]>([])

onChange((newFiles) => {
  if (newFiles === null) {
    filesWithObjectUrl.value.forEach(({ url }) => URL.revokeObjectURL(url))
    filesWithObjectUrl.value = []
    return
  }
  filesWithObjectUrl.value = Array.from(newFiles).map((file) => ({
    file,
    url: URL.createObjectURL(file),
  }))
})

const selectedFiles = ref<Set<string>>(new Set())

const toggleFileSelection = (fileUrl: string) => {
  if (selectedFiles.value.has(fileUrl)) {
    selectedFiles.value.delete(fileUrl)
  } else {
    selectedFiles.value.add(fileUrl)
  }
}

const goToNextStep = () => {
  const selectedFilesArray = filesWithObjectUrl.value.filter(({ url }) =>
    selectedFiles.value.has(url),
  )
  emit('next', selectedFilesArray)
}
</script>

<template>
  <h1>Welcome to BoltParser</h1>
  <p>Select your images that you wish to parse.</p>
  <div class="actions">
    <button v-if="!filesWithObjectUrl.length" type="button" @click="() => open()">
      Choose file
    </button>
    <template v-else>
      <button type="button" @click="() => reset()">Reset</button>
      <button
        :disabled="!selectedFiles.size"
        element="button"
        type="button"
        @click="() => goToNextStep()"
      >
        Next
      </button>
    </template>
  </div>
  <div class="file-list">
    <div
      v-for="file in filesWithObjectUrl"
      :key="file.url"
      class="file-item"
      @click="toggleFileSelection(file.url)"
    >
      <div class="image-container">
        <img :src="file.url" />
        <div v-if="selectedFiles.has(file.url)" class="checkmark">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" fill="#4CAF50" />
            <path
              d="M9 12l2 2 4-4"
              stroke="white"
              stroke-width="2"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.file-item {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease;
}

.file-item:hover {
  transform: scale(1.02);
}

.image-container {
  position: relative;
  max-width: 100%;
  max-height: 100%;
}

.file-list img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.checkmark {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  padding: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.actions {
  margin-top: 1rem;
  display: flex;
  gap: 2rem;
  justify-content: center;
}
</style>
