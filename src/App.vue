<script setup lang="ts">
import { ref } from 'vue'
import Upload from './Components/Upload.vue'
import Parse from './Components/Parse.vue'
import Results from './Components/Results.vue'
import type { TFilesWithObjectUrl, ParsedResult } from './Types/types'

const currStep = ref(0)

const filesToParse = ref<TFilesWithObjectUrl[]>([])
const parseResults = ref<ParsedResult[]>([])

const handleParseStep = (files: TFilesWithObjectUrl[]) => {
  console.log('Files received from Upload component:', files)
  filesToParse.value = files
  currStep.value = 1
}

const handleParseResults = (results: ParsedResult[]) => {
  console.log('Parse results received:', results)
  parseResults.value = results
  currStep.value = 2
}

const goBackToUpload = () => {
  currStep.value = 0
  parseResults.value = []
}

const goBackToParse = () => {
  currStep.value = 1
}
</script>

<template>
  <main class="app">
    <Upload v-if="currStep === 0" @next="handleParseStep" />
    <Parse
      v-else-if="currStep === 1"
      :files="filesToParse"
      @back="goBackToUpload"
      @results="handleParseResults"
    />
    <Results v-else-if="currStep === 2" :results="parseResults" @back="goBackToParse" />
  </main>
</template>

<style>
.app {
  padding: 1rem;
  text-align: center;
  min-height: 100vh;
  box-sizing: border-box;
}

button {
  margin-top: 1rem;
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
  .app {
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  .app {
    padding: 0.25rem;
  }
}

/* Global mobile-friendly styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
    'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
