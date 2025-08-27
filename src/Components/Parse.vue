<script setup lang="ts">
import type { TFilesWithObjectUrl, Rectangle, ParsedResult } from '@/Types/types'
import { createWorker, createScheduler } from 'tesseract.js'
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue'
import { useElementBounding } from '@vueuse/core'

const scheduler = createScheduler()
const { files = [] } = defineProps<{
  files: TFilesWithObjectUrl[]
}>()

const emit = defineEmits<{
  back: []
  results: [results: ParsedResult[]]
}>()

const goBack = () => {
  // Save rectangles to localStorage before leaving
  saveRectanglesToStorage()

  files.forEach(({ url }) => URL.revokeObjectURL(url))
  emit('back')
}

// Canvas and drawing state
const canvasRef = ref<HTMLCanvasElement>()
const imageRef = ref<HTMLImageElement>()
const isDrawing = ref(false)
const rectangles = ref<Rectangle[]>([])
const currentRect = ref<Rectangle | null>(null)
const startPoint = ref({ x: 0, y: 0 })

// Parsing state
const isParsing = ref(false)
const parseProgress = ref(0)
const parseStatus = ref('')

const { left: canvasLeft, top: canvasTop } = useElementBounding(canvasRef)

const firstImage = computed(() => files[0]?.url || '')

// LocalStorage functions
const getStorageKey = () => {
  return `boltparser-rectangles`
}

const saveRectanglesToStorage = () => {
  try {
    const storageKey = getStorageKey()
    const rectangleData = {
      rectangles: rectangles.value,
      timestamp: Date.now(),
      imageInfo: {
        fileName: files[0]?.file.name,
        fileCount: files.length,
      },
    }
    localStorage.setItem(storageKey, JSON.stringify(rectangleData))
    console.log('Rectangles saved to localStorage:', storageKey)
  } catch (error) {
    console.warn('Failed to save rectangles to localStorage:', error)
  }
}

const loadRectanglesFromStorage = () => {
  try {
    const storageKey = getStorageKey()
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const data = JSON.parse(stored)
      // Validate the data structure
      if (data.rectangles && Array.isArray(data.rectangles)) {
        rectangles.value = data.rectangles
        console.log('Rectangles loaded from localStorage:', data.rectangles.length, 'rectangles')
        // Redraw canvas if it's ready
        if (canvasRef.value && imageRef.value?.complete) {
          nextTick(() => {
            drawCanvas()
          })
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load rectangles from localStorage:', error)
  }
}

const clearRectanglesFromStorage = () => {
  try {
    const storageKey = getStorageKey()
    localStorage.removeItem(storageKey)
    console.log('Rectangles cleared from localStorage:', storageKey)
  } catch (error) {
    console.warn('Failed to clear rectangles from localStorage:', error)
  }
}

const getImageScale = () => {
  if (!imageRef.value || !canvasRef.value) return { scaleX: 1, scaleY: 1 }

  const imageNaturalWidth = imageRef.value.naturalWidth
  const imageNaturalHeight = imageRef.value.naturalHeight
  const canvasWidth = canvasRef.value.width
  const canvasHeight = canvasRef.value.height

  return {
    scaleX: imageNaturalWidth / canvasWidth,
    scaleY: imageNaturalHeight / canvasHeight,
  }
}

const getCanvasCoordinates = (clientX: number, clientY: number) => {
  return {
    x: clientX - canvasLeft.value,
    y: clientY - canvasTop.value,
  }
}

const startDrawing = (event: MouseEvent | TouchEvent) => {
  if (!canvasRef.value) return

  event.preventDefault() // Prevent scrolling on touch devices
  isDrawing.value = true

  let clientX: number, clientY: number
  // Safari-compatible touch event detection
  if ('touches' in event && event.touches && event.touches.length > 0) {
    const touch = event.touches[0]
    clientX = touch.clientX
    clientY = touch.clientY
  } else {
    const mouseEvent = event as MouseEvent
    clientX = mouseEvent.clientX
    clientY = mouseEvent.clientY
  }

  const coords = getCanvasCoordinates(clientX, clientY)
  startPoint.value = { x: coords.x, y: coords.y }
  currentRect.value = {
    left: coords.x,
    top: coords.y,
    width: 0,
    height: 0,
  }
}

const draw = (event: MouseEvent | TouchEvent) => {
  if (!isDrawing.value || !currentRect.value || !canvasRef.value) return

  event.preventDefault() // Prevent scrolling on touch devices

  let clientX: number, clientY: number
  // Safari-compatible touch event detection
  if ('touches' in event && event.touches && event.touches.length > 0) {
    const touch = event.touches[0]
    clientX = touch.clientX
    clientY = touch.clientY
  } else {
    const mouseEvent = event as MouseEvent
    clientX = mouseEvent.clientX
    clientY = mouseEvent.clientY
  }

  const coords = getCanvasCoordinates(clientX, clientY)
  const width = coords.x - startPoint.value.x
  const height = coords.y - startPoint.value.y

  currentRect.value = {
    left: Math.min(startPoint.value.x, coords.x),
    top: Math.min(startPoint.value.y, coords.y),
    width: Math.abs(width),
    height: Math.abs(height),
  }

  drawCanvas()
}

const stopDrawing = () => {
  if (!isDrawing.value || !currentRect.value) return

  isDrawing.value = false

  if (currentRect.value.width > 5 && currentRect.value.height > 5) {
    const scale = getImageScale()
    const actualRect: Rectangle = {
      left: Math.round(currentRect.value.left * scale.scaleX),
      top: Math.round(currentRect.value.top * scale.scaleY),
      width: Math.round(currentRect.value.width * scale.scaleX),
      height: Math.round(currentRect.value.height * scale.scaleY),
    }

    rectangles.value.push(actualRect)
    console.log('Rectangle saved:', actualRect)

    // Save to localStorage
    saveRectanglesToStorage()
  }

  currentRect.value = null
  drawCanvas()
}

const drawCanvas = () => {
  if (!canvasRef.value || !imageRef.value) return

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  // Draw image
  ctx.drawImage(imageRef.value, 0, 0, canvasRef.value.width, canvasRef.value.height)

  // Draw saved rectangles
  const scale = getImageScale()
  rectangles.value.forEach((rect) => {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'
    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
    ctx.lineWidth = 2

    const canvasRect = {
      left: rect.left / scale.scaleX,
      top: rect.top / scale.scaleY,
      width: rect.width / scale.scaleX,
      height: rect.height / scale.scaleY,
    }

    ctx.fillRect(canvasRect.left, canvasRect.top, canvasRect.width, canvasRect.height)
    ctx.strokeRect(canvasRect.left, canvasRect.top, canvasRect.width, canvasRect.height)
  })

  // Draw current rectangle
  if (currentRect.value && isDrawing.value) {
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)'
    ctx.lineWidth = 2

    ctx.fillRect(
      currentRect.value.left,
      currentRect.value.top,
      currentRect.value.width,
      currentRect.value.height,
    )
    ctx.strokeRect(
      currentRect.value.left,
      currentRect.value.top,
      currentRect.value.width,
      currentRect.value.height,
    )
  }
}

const setupCanvas = () => {
  if (!imageRef.value || !canvasRef.value) return

  const img = imageRef.value
  const canvas = canvasRef.value

  // Calculate responsive canvas size
  const maxWidth = Math.min(window.innerWidth - 32, 800) // 16px padding on each side
  const maxHeight = Math.min(window.innerHeight * 0.6, 600) // Max 60% of viewport height

  const aspectRatio = img.naturalHeight / img.naturalWidth

  let canvasWidth = maxWidth
  let canvasHeight = maxWidth * aspectRatio

  // If height exceeds max, scale down
  if (canvasHeight > maxHeight) {
    canvasHeight = maxHeight
    canvasWidth = maxHeight / aspectRatio
  }

  canvas.width = canvasWidth
  canvas.height = canvasHeight

  nextTick(() => {
    drawCanvas()
  })
}

const clearRectangles = () => {
  rectangles.value = []
  drawCanvas()

  // Clear from localStorage
  clearRectanglesFromStorage()
}

const parseText = async () => {
  if (rectangles.value.length === 0) {
    alert('Please select some areas to parse first!')
    return
  }

  isParsing.value = true
  parseProgress.value = 0
  parseStatus.value = 'Preparing to parse all areas...'

  try {
    const results: ParsedResult[] = []

    // Create all jobs for all rectangles on all files in parallel
    const allJobs: Array<{
      fileIndex: number
      fileName: string
      rectangleIndex: number
      rectangle: Rectangle
      job: Promise<{ data: { text: string; confidence: number } }>
    }> = []

    // Generate all jobs first
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex]

      for (let rectangleIndex = 0; rectangleIndex < rectangles.value.length; rectangleIndex++) {
        const rectClone = { ...rectangles.value[rectangleIndex] }
        allJobs.push({
          fileIndex,
          fileName: file.file.name,
          rectangleIndex,
          rectangle: rectClone,
          job: scheduler.addJob('recognize', file.file, { rectangle: rectClone }),
        })
      }
    }

    parseStatus.value = `Processing ${allJobs.length} areas across ${files.length} images in parallel...`

    // Process all jobs in parallel
    const allResults = await Promise.all(
      allJobs.map(async (jobData, index) => {
        const result = await jobData.job

        // Update progress as jobs complete
        parseProgress.value = ((index + 1) / allJobs.length) * 100

        return {
          fileIndex: jobData.fileIndex,
          fileName: jobData.fileName,
          rectangleIndex: jobData.rectangleIndex,
          rectangle: jobData.rectangle,
          text: result.data.text.trim(),
          confidence: result.data.confidence,
          imageCreatedAt: files[jobData.fileIndex]?.createdAt,
        } as ParsedResult
      }),
    )

    results.push(...allResults)
    parseStatus.value = 'Parsing complete!'
    isParsing.value = false

    // Emit results to parent component
    emit('results', results)
  } catch (error) {
    console.error('Error during parsing:', error)
    parseStatus.value = 'Error occurred during parsing'
    isParsing.value = false
    alert('An error occurred during parsing. Please try again.')
  }
}

const handleResize = () => {
  if (imageRef.value?.complete && canvasRef.value) {
    setupCanvas()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)

  // Load rectangles from localStorage when component mounts
  loadRectanglesFromStorage()

  const numWorkers = files.length % 4 === 0 ? files.length / 4 : Math.floor(files.length / 4) + 1

  const workerPoolPromises = []
  for (let i = 0; i < numWorkers; i++) {
    const worker = createWorker('eng', 1, {
      logger: (m) => console.log(m),
    })
    workerPoolPromises.push(
      worker.then((worker) => {
        scheduler.addWorker(worker)
      }),
    )
  }
  Promise.all(workerPoolPromises).then(() => {
    console.log('All workers are ready')
  })
})

onUnmounted(() => {
  // Save rectangles to localStorage before component unmounts
  saveRectanglesToStorage()

  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="parse">
    <h1>Bolt Parser</h1>
    <p>Select areas to parse.</p>
    <span>Drag on the image to select areas:</span>

    <!-- Parse button above canvas -->
    <div class="parse-section">
      <button
        @click="parseText"
        :disabled="isParsing || rectangles.length === 0"
        class="parse-button"
      >
        {{ isParsing ? 'Parsing...' : 'Parse Text' }}
      </button>
      <div v-if="isParsing" class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: parseProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ parseStatus }}</span>
      </div>
    </div>

    <div v-if="firstImage" class="canvas-container">
      <img
        ref="imageRef"
        :src="firstImage"
        @load="setupCanvas"
        style="display: none"
        alt="Source image"
      />
      <canvas
        ref="canvasRef"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        @touchstart="startDrawing"
        @touchmove="draw"
        @touchend="stopDrawing"
        @touchcancel="stopDrawing"
        class="selection-canvas"
      ></canvas>
    </div>

    <div class="controls">
      <button @click="goBack" class="back-button">← Back to Upload</button>
      <button @click="clearRectangles" :disabled="rectangles.length === 0">
        Clear Selections ({{ rectangles.length }})
      </button>
    </div>

    <!-- Parse button below canvas -->
    <div v-if="rectangles.length > 0" class="parse-section">
      <button
        @click="parseText"
        :disabled="isParsing || rectangles.length === 0"
        class="parse-button"
      >
        {{ isParsing ? 'Parsing...' : 'Parse Text' }}
      </button>
      <div v-if="isParsing" class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: parseProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ parseStatus }}</span>
      </div>
    </div>

    <div v-if="rectangles.length > 0" class="rectangles-list">
      <h3>Selected Areas:</h3>
      <div v-for="(rect, index) in rectangles" :key="index" class="rectangle-item">
        <code>{{ JSON.stringify(rect, null, 2) }}</code>
      </div>
    </div>
  </div>
</template>
<style scoped>
.parse {
  max-width: 900px;
  margin: 1rem auto;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.canvas-container {
  margin: 1rem 0;
  border: 2px solid #ddd;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  background: #f9f9f9;
  overflow: hidden;
}

.selection-canvas {
  display: block;
  cursor: crosshair;
  border-radius: 4px;
  max-width: 100%;
  height: auto;
  touch-action: none; /* Prevent scrolling while drawing */
}

.controls {
  margin: 1rem 0;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.parse-section {
  margin: 1.5rem 0;
  text-align: center;
}

.parse-button {
  background: #28a745;
  font-size: 16px;
  font-weight: 600;
  padding: 1rem 2rem;
  min-width: 200px;
}

.parse-button:hover:not(:disabled) {
  background: #218838;
}

.parse-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.progress-container {
  margin-top: 1rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #28a745;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 14px;
  color: #666;
  font-style: italic;
}

.back-button {
  background: #6c757d;
}

.back-button:hover {
  background: #5a6268;
}

.rectangles-list {
  margin-top: 2rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.rectangle-item {
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow-x: auto;
}

.rectangle-item code {
  display: block;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  white-space: pre;
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
  min-height: 44px; /* Minimum touch target size */
  min-width: 44px;
}

button:hover {
  background: #005a9e;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Mobile-specific styles */
@media (max-width: 768px) {
  .parse {
    margin: 0.5rem;
    padding: 0.75rem;
  }

  .canvas-container {
    margin: 0.75rem 0;
    border-width: 1px;
  }

  .controls {
    flex-direction: column;
    gap: 0.75rem;
  }

  .controls button {
    width: 100%;
    max-width: 300px;
  }

  .parse-section {
    margin: 1rem 0;
  }

  .parse-button {
    width: 100%;
    max-width: 300px;
    font-size: 15px;
    padding: 0.875rem 1.5rem;
  }

  .progress-container {
    max-width: 300px;
  }

  .rectangles-list {
    margin-top: 1rem;
    padding: 0.75rem;
  }

  .rectangle-item code {
    font-size: 11px;
  }

  h1 {
    font-size: 1.5rem;
  }

  h3 {
    font-size: 1.2rem;
  }
}

@media (max-width: 480px) {
  .parse {
    margin: 0.25rem;
    padding: 0.5rem;
  }

  .rectangle-item code {
    font-size: 10px;
  }
}

textarea {
  width: 100%;
  font-family: monospace;
}
</style>
