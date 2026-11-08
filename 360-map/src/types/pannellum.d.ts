// Pannellum ships a browser bundle that assigns `window.pannellum` and has no
// ESM exports, so it is imported for side effects only.

declare module 'pannellum/build/pannellum.js'

export interface PannellumViewer {
  destroy: () => void
  on: (event: string, handler: () => void) => void
  off: (event: string, handler: () => void) => void
  getYaw: () => number
  setYaw: (yaw: number, animated?: boolean | number) => void
  getPitch: () => number
  setPitch: (pitch: number, animated?: boolean | number) => void
  getHfov: () => number
  setHfov: (hfov: number, animated?: boolean | number) => void
  toggleFullscreen: () => void
}

export interface PannellumConfig {
  type: 'equirectangular' | 'cubemap' | 'multires'
  panorama: string
  preview?: string
  autoLoad?: boolean
  autoRotate?: number
  compass?: boolean
  showFullscreenCtrl?: boolean
  showZoomCtrl?: boolean
  showControls?: boolean
  hfov?: number
  minHfov?: number
  maxHfov?: number
  pitch?: number
  yaw?: number
  [key: string]: unknown
}

declare global {
  interface Window {
    pannellum?: {
      viewer: (element: HTMLElement, config: PannellumConfig) => PannellumViewer
    }
  }
}
