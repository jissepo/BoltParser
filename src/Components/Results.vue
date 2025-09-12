<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ParsedResult } from '@/Types/types'
import { saveScan } from '@/utils/scanStorage'

const { results = [] } = defineProps<{
  results: ParsedResult[]
}>()

const emit = defineEmits<{
  back: []
  backToUpload: []
}>()

const showSaveDialog = ref(false)
const scanName = ref('')
const isSaved = ref(false)

const goBack = () => {
  emit('back')
}

const goBackToUpload = () => {
  emit('backToUpload')
}

const openSaveDialog = () => {
  if (results.length === 0) {
    alert('No results to save!')
    return
  }
  showSaveDialog.value = true
  scanName.value = `Scan ${new Date().toLocaleDateString('et')}`
}

const closeSaveDialog = () => {
  showSaveDialog.value = false
  scanName.value = ''
}

const saveResults = () => {
  try {
    const savedId = saveScan(results, scanName.value.trim() || undefined)
    isSaved.value = true
    showSaveDialog.value = false

    // Show confirmation for 3 seconds
    setTimeout(() => {
      isSaved.value = false
    }, 3000)

    console.log('Results saved with ID:', savedId)
  } catch (error) {
    console.error('Failed to save results:', error)
    alert('Failed to save results. Please try again.')
  }
}

const formatCreationTime = (date: Date | undefined) => {
  if (!date) return null

  // Round to nearest 5 minutes
  const roundedDate = new Date(date)
  const minutes = roundedDate.getMinutes()
  const roundedMinutes = Math.round(minutes / 5) * 5
  roundedDate.setMinutes(roundedMinutes, 0, 0) // Also reset seconds and milliseconds

  return roundedDate.toLocaleString('et', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Organize results as a matrix: images as rows, rectangles as columns
const resultMatrix = computed(() => {
  if (results.length === 0) return { images: [], rectangleCount: 0 }

  // Get unique file indices and rectangle indices
  const fileIndices = [...new Set(results.map((r) => r.fileIndex))].sort()
  const rectangleIndices = [...new Set(results.map((r) => r.rectangleIndex))].sort()

  // Create matrix
  const images = fileIndices.map((fileIndex) => {
    const fileResults = results.filter((r) => r.fileIndex === fileIndex)
    const fileName = fileResults[0]?.fileName || `File ${fileIndex + 1}`

    // Create array for all rectangles, some might be undefined if not processed
    const rectangleResults = rectangleIndices.map((rectIndex) =>
      fileResults.find((r) => r.rectangleIndex === rectIndex),
    )

    return {
      fileIndex,
      fileName,
      rectangleResults,
      createdAt: fileResults[0]?.imageCreatedAt,
    }
  })

  return {
    images,
    rectangleCount: rectangleIndices.length,
  }
})
</script>

<template>
  <div class="results">
    <h1>Parsing Results</h1>
    <p>Text extracted from selected areas</p>

    <div class="controls">
      <button @click="goBackToUpload" class="back-to-upload-button">← Back to Upload</button>
      <button @click="goBack" class="back-button">← Back to Selection</button>
      <button @click="openSaveDialog" class="save-button" :disabled="results.length === 0">
        💾 Save Results
      </button>
      <div v-if="isSaved" class="save-confirmation">✅ Results saved successfully!</div>
    </div>

    <!-- Save Dialog -->
    <div v-if="showSaveDialog" class="save-dialog-overlay" @click="closeSaveDialog">
      <div class="save-dialog" @click.stop>
        <h3>Save Scan Results</h3>
        <p>Enter a name for this scan session (optional):</p>
        <input
          v-model="scanName"
          type="text"
          placeholder="Scan name..."
          class="scan-name-input"
          @keyup.enter="saveResults"
        />
        <div class="dialog-buttons">
          <button @click="closeSaveDialog" class="cancel-button">Cancel</button>
          <button @click="saveResults" class="confirm-save-button">Save</button>
        </div>
      </div>
    </div>

    <div v-if="resultMatrix.images.length === 0" class="no-results">
      <p>No results to display</p>
    </div>

    <div v-else class="results-container">
      <div class="table-container">
        <table class="results-table">
          <thead>
            <tr>
              <th>Image</th>
              <th v-for="rectIndex in resultMatrix.rectangleCount" :key="rectIndex">
                Area {{ rectIndex }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="image in resultMatrix.images" :key="image.fileIndex">
              <td class="image-name">
                <div v-if="image.createdAt" class="creation-time">
                  {{ formatCreationTime(image.createdAt) }}
                </div>
              </td>
              <td
                v-for="(result, rectIndex) in image.rectangleResults"
                :key="rectIndex"
                class="text-result"
              >
                <div v-if="result" class="result-cell">
                  {{ result.text || '(no text found)' }}
                </div>
                <div v-else class="empty-cell">
                  <span class="no-data">No data</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.results {
  max-width: 1200px;
  margin: 1rem auto;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.controls {
  margin: 1rem 0;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.back-button {
  background: #6c757d;
}

.back-button:hover {
  background: #5a6268;
}

.back-to-upload-button {
  background: #dc3545;
}

.back-to-upload-button:hover {
  background: #c82333;
}

.save-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.save-button:hover:not(:disabled) {
  background: #218838;
}

.save-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.save-confirmation {
  background: #d4edda;
  color: #155724;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.save-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.save-dialog {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90%;
}

.save-dialog h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.save-dialog p {
  margin: 0 0 1rem 0;
  color: #666;
}

.scan-name-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  box-sizing: border-box;
}

.dialog-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-button,
.confirm-save-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.cancel-button {
  background: #6c757d;
  color: white;
}

.cancel-button:hover {
  background: #5a6268;
}

.confirm-save-button {
  background: #28a745;
  color: white;
}

.confirm-save-button:hover {
  background: #218838;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.results-container {
  margin-top: 2rem;
}

.table-container {
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  min-width: 600px; /* Ensure table doesn't get too cramped */
}

.results-table th,
.results-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
  border-right: 1px solid #eee;
  vertical-align: top;
}

.results-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  text-align: center;
}

.results-table tbody tr:hover {
  background: #f8f9fa;
}

.image-name {
  min-width: 150px;
  max-width: 200px;
  word-break: break-word;
}

.image-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.text-result {
  min-width: 200px;
  max-width: 300px;
}

.result-cell {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.text-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.4;
  padding: 0.5rem;
  background: #f9f9f9;
  border-radius: 3px;
  min-height: 40px;
  display: flex;
  align-items: center;
}

.confidence-badge {
  display: flex;
  justify-content: center;
}

.confidence-value {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.85rem;
  display: inline-block;
}

.confidence-value.high {
  background: #d4edda;
  color: #155724;
}

.confidence-value.medium {
  background: #fff3cd;
  color: #856404;
}

.confidence-value.low {
  background: #f8d7da;
  color: #721c24;
}

.empty-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.no-data {
  color: #999;
  font-style: italic;
  font-size: 0.9rem;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .results {
    margin: 0.5rem;
    padding: 0.75rem;
  }

  .controls {
    flex-direction: column;
    gap: 0.75rem;
  }

  .controls button {
    width: 100%;
    max-width: 300px;
    order: 2; /* Default order for back buttons */
  }

  .back-to-upload-button {
    order: 1; /* Put "Back to Upload" button first on mobile */
  }

  .results-table {
    font-size: 0.9rem;
    min-width: 500px; /* Smaller min-width for mobile */
  }

  .results-table th,
  .results-table td {
    padding: 0.5rem;
  }

  .image-name {
    min-width: 120px;
    max-width: 150px;
  }

  .text-result {
    min-width: 150px;
    max-width: 200px;
  }

  .text-content {
    font-size: 0.85rem;
    padding: 0.375rem;
  }

  .confidence-value {
    font-size: 0.8rem;
    padding: 0.2rem 0.4rem;
  }
}

@media (max-width: 480px) {
  .results-table {
    font-size: 0.8rem;
    min-width: 400px;
  }

  .results-table th,
  .results-table td {
    padding: 0.4rem;
  }

  .image-name {
    min-width: 100px;
    max-width: 120px;
  }

  .text-result {
    min-width: 120px;
    max-width: 150px;
  }

  .text-content {
    font-size: 0.8rem;
    padding: 0.3rem;
    min-height: 35px;
  }

  h1 {
    font-size: 1.5rem;
  }
}

button {
  margin: 0.25rem;
  padding: 0.75rem 1rem;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  min-height: 44px;
  min-width: 44px;
}

button:hover {
  background: #005a9e;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
