<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { SavedScan } from '@/Types/types'
import {
  getSavedScans,
  deleteScan,
  deleteResultFromScan,
  getScansInDateRange,
  cleanupOldScans,
} from '@/utils/scanStorage'

const emit = defineEmits<{
  back: []
}>()

const savedScans = ref<SavedScan[]>([])
const startDate = ref('')
const endDate = ref('')
const showDateFilter = ref(false)

const goBack = () => {
  emit('back')
}

const loadScans = () => {
  if (startDate.value && endDate.value) {
    const start = new Date(startDate.value)
    const end = new Date(endDate.value)
    savedScans.value = getScansInDateRange(start, end)
  } else {
    savedScans.value = getSavedScans()
  }
}

const clearDateFilter = () => {
  startDate.value = ''
  endDate.value = ''
  showDateFilter.value = false
  loadScans()
}

const toggleDateFilter = () => {
  showDateFilter.value = !showDateFilter.value
  if (!showDateFilter.value) {
    clearDateFilter()
  }
}

const applyDateFilter = () => {
  if (startDate.value && endDate.value) {
    loadScans()
  }
}

const deleteScanSession = (scanId: string) => {
  if (confirm('Are you sure you want to delete this scan session?')) {
    deleteScan(scanId)
    loadScans()
  }
}

const deleteResultRow = (scanId: string, fileIndex: number) => {
  if (confirm('Are you sure you want to delete this result row?')) {
    deleteResultFromScan(scanId, fileIndex)
    loadScans()
  }
}

const formatScanDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('et', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCreationTime = (date: Date | undefined) => {
  if (!date) return null

  // Round to nearest 5 minutes
  const roundedDate = new Date(date)
  const minutes = roundedDate.getMinutes()
  const roundedMinutes = Math.round(minutes / 5) * 5
  roundedDate.setMinutes(roundedMinutes, 0, 0)

  return roundedDate.toLocaleString('et', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Organize results as a matrix for each scan
const getResultMatrix = (scan: SavedScan) => {
  const results = scan.results
  if (results.length === 0) return { images: [], rectangleCount: 0 }

  const fileIndices = [...new Set(results.map((r) => r.fileIndex))].sort()
  const rectangleIndices = [...new Set(results.map((r) => r.rectangleIndex))].sort()

  const images = fileIndices.map((fileIndex) => {
    const fileResults = results.filter((r) => r.fileIndex === fileIndex)
    const fileName = fileResults[0]?.fileName || `File ${fileIndex + 1}`

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
  // .sort((a, b) => {
  //   // Sort by creation time if available, otherwise by file index
  //   if (a.createdAt && b.createdAt) {
  //     return a.createdAt.getTime() - b.createdAt.getTime()
  //   }
  //   return a.fileIndex - b.fileIndex
  // })

  return {
    images,
    rectangleCount: rectangleIndices.length,
  }
}

onMounted(() => {
  cleanupOldScans() // Clean up old scans on component mount
  loadScans()
})
</script>

<template>
  <div class="history">
    <h1>Scan History</h1>
    <p>View and manage your previous OCR scan results</p>

    <div class="controls">
      <button @click="goBack" class="back-button">← Back to Upload</button>
      <button @click="toggleDateFilter" class="filter-button">
        {{ showDateFilter ? 'Hide' : 'Show' }} Date Filter
      </button>
    </div>

    <div v-if="showDateFilter" class="date-filter">
      <div class="date-inputs">
        <div class="date-input">
          <label for="start-date">From:</label>
          <input id="start-date" v-model="startDate" type="date" @change="applyDateFilter" />
        </div>
        <div class="date-input">
          <label for="end-date">To:</label>
          <input id="end-date" v-model="endDate" type="date" @change="applyDateFilter" />
        </div>
        <button @click="clearDateFilter" class="clear-filter-button">Clear Filter</button>
      </div>
    </div>

    <div v-if="savedScans.length === 0" class="no-scans">
      <p>No scan sessions found{{ startDate && endDate ? ' for the selected date range' : '' }}</p>
    </div>

    <div v-else class="scans-container">
      <div v-for="scan in savedScans" :key="scan.id" class="scan-session">
        <div class="scan-header">
          <div class="scan-info">
            <h3>{{ scan.name || 'Unnamed Scan' }}</h3>
            <span class="scan-date">{{ formatScanDate(scan.timestamp) }}</span>
          </div>
          <button
            @click="deleteScanSession(scan.id)"
            class="delete-scan-button"
            title="Delete entire scan session"
          >
            🗑️
          </button>
        </div>

        <div class="results-container">
          <div class="table-container">
            <table class="results-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th v-for="rectIndex in getResultMatrix(scan).rectangleCount" :key="rectIndex">
                    Area {{ rectIndex }}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="image in getResultMatrix(scan).images"
                  :key="`${scan.id}-${image.fileIndex}`"
                >
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
                  <td class="actions-cell">
                    <button
                      @click="deleteResultRow(scan.id, image.fileIndex)"
                      class="delete-row-button"
                      title="Delete this result row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.back-button,
.filter-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-button {
  background: #6c757d;
  color: white;
}

.back-button:hover {
  background: #5a6268;
}

.filter-button {
  background: #007bff;
  color: white;
}

.filter-button:hover {
  background: #0056b3;
}

.date-filter {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.date-inputs {
  display: flex;
  gap: 1rem;
  align-items: end;
  flex-wrap: wrap;
}

.date-input {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-input label {
  font-weight: 500;
  font-size: 0.9rem;
}

.date-input input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.clear-filter-button {
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.clear-filter-button:hover {
  background: #c82333;
}

.no-scans {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
}

.scans-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.scan-session {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  background: white;
}

.scan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #dee2e6;
}

.scan-info h3 {
  margin: 0;
  color: #495057;
}

.scan-date {
  color: #6c757d;
  font-size: 0.9rem;
}

.delete-scan-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.delete-scan-button:hover {
  background: #f8d7da;
}

.results-container {
  overflow-x: auto;
}

.table-container {
  min-width: 600px;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.results-table th,
.results-table td {
  border: 1px solid #dee2e6;
  padding: 0.75rem;
  text-align: left;
  vertical-align: top;
}

.results-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
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
  font-size: 0.9rem;
  line-height: 1.4;
  word-break: break-word;
}

.confidence-badge {
  align-self: flex-start;
}

.confidence-value {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  background: #e9ecef;
  color: #495057;
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
  color: #6c757d;
  font-style: italic;
}

.actions-cell {
  width: 60px;
  text-align: center;
}

.delete-row-button {
  background: none;
  border: none;
  color: #dc3545;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.delete-row-button:hover {
  background: #f8d7da;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .controls {
    flex-direction: column;
  }

  .date-inputs {
    flex-direction: column;
  }

  .results-table {
    font-size: 0.85rem;
    min-width: 500px;
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
  }

  .confidence-value {
    font-size: 0.75rem;
    padding: 0.15rem 0.3rem;
  }
}
</style>
