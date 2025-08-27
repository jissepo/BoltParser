export type TFilesWithObjectUrl = {
  file: File
  url: string
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
}
