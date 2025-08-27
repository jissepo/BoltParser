<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { ref } from 'vue'
import exifr from 'exifr'
import type { TFilesWithObjectUrl } from '@/Types/types'

const emit = defineEmits<{
  (e: 'next', files: TFilesWithObjectUrl[]): void
}>()

const { open, reset, onChange } = useFileDialog({
  accept: 'image/*', // Set to accept only image files
  multiple: true, // Allow multiple file selection
})

const filesWithObjectUrl = ref<TFilesWithObjectUrl[]>([])

const extractCreationTime = async (file: File): Promise<Date | undefined> => {
  try {
    const exifData = await exifr.parse(file)
    // Try different EXIF fields for creation date
    const createdAt =
      exifData?.DateTimeOriginal ||
      exifData?.DateTime ||
      exifData?.CreateDate ||
      exifData?.DateTimeDigitized

    if (createdAt) {
      return new Date(createdAt)
    }

    // Fallback to file's last modified date
    return new Date(file.lastModified)
  } catch (error) {
    console.warn('Could not extract EXIF data from', file.name, error)
    // Fallback to file's last modified date
    return new Date(file.lastModified)
  }
}

onChange(async (newFiles) => {
  if (newFiles === null) {
    filesWithObjectUrl.value.forEach(({ url }) => URL.revokeObjectURL(url))
    filesWithObjectUrl.value = []
    return
  }

  const filesArray = Array.from(newFiles)
  const filesWithMetadata: TFilesWithObjectUrl[] = []

  for (const file of filesArray) {
    const createdAt = await extractCreationTime(file)
    filesWithMetadata.push({
      file,
      url: URL.createObjectURL(file),
      createdAt,
    })
  }

  filesWithObjectUrl.value = filesWithMetadata
})

const goToNextStep = () => {
  emit('next', filesWithObjectUrl.value)
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
      <button element="button" type="button" @click="() => goToNextStep()">Parse</button>
    </template>
  </div>
  <div class="file-list">
    <div v-for="file in filesWithObjectUrl" :key="file.url" class="file-item">
      <div class="image-container">
        <img :src="file.url" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.file-item {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease;
  border: 2px solid #ddd;
}

.file-item:hover {
  transform: scale(1.02);
  border-color: #007acc;
}

.image-container {
  position: relative;
  max-width: 100%;
  max-height: 200px;
  overflow: hidden;
}

.file-list img {
  width: 100%;
  height: 200px;
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
  margin: 1.5rem 0;
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.actions button {
  min-width: 120px;
}

/* Mobile-specific styles */
@media (max-width: 768px) {
  .file-list {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
    margin: 0.75rem 0;
  }

  .image-container {
    max-height: 150px;
  }

  .file-list img {
    height: 150px;
  }

  .actions {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .actions button {
    width: 100%;
    max-width: 300px;
  }
}

@media (max-width: 480px) {
  .file-list {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.5rem;
  }

  .image-container {
    max-height: 120px;
  }

  .file-list img {
    height: 120px;
  }

  h1 {
    font-size: 1.5rem;
  }

  p {
    font-size: 0.9rem;
  }
}
</style>
