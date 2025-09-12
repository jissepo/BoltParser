export type TFilesWithObjectUrl = {
  file: File
  url: string
  createdAt?: Date
}

export interface Rectangle {
  left: number
  top: number
  width: number
  height: number
}

export interface ParsedResult {
  fileIndex: number
  fileName: string
  rectangleIndex: number
  rectangle: Rectangle
  text: string
  confidence: number
  imageCreatedAt?: Date
}

export interface ScanSession {
  id: string
  timestamp: Date
  results: ParsedResult[]
  name?: string
}

export interface SavedScan {
  id: string
  timestamp: number
  results: ParsedResult[]
  name?: string
}
