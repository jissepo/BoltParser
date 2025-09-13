import type { ParsedResult, SavedScan } from '@/Types/types'

const STORAGE_KEY = 'boltparser-saved-scans'
const RETENTION_MONTHS = 3

export function generateScanId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function saveScan(results: ParsedResult[], name?: string): string {
  const scanId = generateScanId()
  const scan: SavedScan = {
    id: scanId,
    timestamp: Date.now(),
    results: results
      .map((result) => ({
        ...result,
        imageCreatedAt: result.imageCreatedAt ? new Date(result.imageCreatedAt) : undefined,
      }))
      .sort((a, b) => {
        // Sort by creation time if available, otherwise by file index
        if (a.imageCreatedAt && b.imageCreatedAt) {
          return a.imageCreatedAt.getTime() - b.imageCreatedAt.getTime()
        }
        return a.fileIndex - b.fileIndex
      }),
    name,
  }

  const existingScans = getSavedScans()
  existingScans.unshift(scan)

  // Clean up old scans (older than 3 months)
  const cutoffDate = Date.now() - RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000
  const filteredScans = existingScans.filter((scan) => scan.timestamp > cutoffDate)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredScans))
  console.log('Scan saved with ID:', scanId)

  return scanId
}

export function getSavedScans(): SavedScan[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const scans = JSON.parse(stored) as SavedScan[]

    // Convert timestamps back to Date objects for imageCreatedAt
    return scans.map((scan) => ({
      ...scan,
      results: scan.results.map((result) => ({
        ...result,
        imageCreatedAt: result.imageCreatedAt ? new Date(result.imageCreatedAt) : undefined,
      })),
    }))
  } catch (error) {
    console.warn('Failed to load saved scans:', error)
    return []
  }
}

export function deleteScan(scanId: string): void {
  const scans = getSavedScans()
  const filteredScans = scans.filter((scan) => scan.id !== scanId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredScans))
  console.log('Scan deleted:', scanId)
}

export function deleteResultFromScan(scanId: string, fileIndex: number): void {
  const scans = getSavedScans()
  const scanIndex = scans.findIndex((scan) => scan.id === scanId)

  if (scanIndex === -1) return

  // Remove all results for the specified file
  scans[scanIndex].results = scans[scanIndex].results.filter(
    (result) => result.fileIndex !== fileIndex,
  )

  // If no results left, delete the entire scan
  if (scans[scanIndex].results.length === 0) {
    scans.splice(scanIndex, 1)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans))
  console.log('Result row deleted from scan:', scanId, 'fileIndex:', fileIndex)
}

export function updateResultText(
  scanId: string,
  fileIndex: number,
  rectangleIndex: number,
  newText: string,
): void {
  const scans = getSavedScans()
  const scanIndex = scans.findIndex((scan) => scan.id === scanId)

  if (scanIndex === -1) return

  const resultIndex = scans[scanIndex].results.findIndex(
    (result) => result.fileIndex === fileIndex && result.rectangleIndex === rectangleIndex,
  )

  if (resultIndex === -1) return

  scans[scanIndex].results[resultIndex].text = newText

  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans))
  console.log(
    'Result text updated for scan:',
    scanId,
    'fileIndex:',
    fileIndex,
    'rectangleIndex:',
    rectangleIndex,
  )
}

export function getScansInDateRange(startDate: Date, endDate: Date): SavedScan[] {
  const allScans = getSavedScans()
  const startTime = startDate.getTime()
  const endTime = endDate.getTime() + 24 * 60 * 60 * 1000 - 1 // End of the end date

  return allScans.filter((scan) => scan.timestamp >= startTime && scan.timestamp <= endTime)
}

export function cleanupOldScans(): void {
  const cutoffDate = Date.now() - RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000
  const scans = getSavedScans()
  const filteredScans = scans.filter((scan) => scan.timestamp > cutoffDate)

  if (filteredScans.length !== scans.length) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredScans))
    console.log(`Cleaned up ${scans.length - filteredScans.length} old scans`)
  }
}
