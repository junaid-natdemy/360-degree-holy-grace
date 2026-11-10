// Pannellum ships a browser bundle that assigns `window.pannellum` and has no
// ESM exports, so it is imported for side effects only.

declare module 'pannellum/build/pannellum.js'

export interface PannellumHotSpot {
  pitch: number
  yaw: number
  type?: 'info' | 'scene' | 'custom'
  text?: string
  URL?: string
  attributes?: Record<string, string>
  cssClass?: string
  createTooltipFunc?: (hotSpotDiv: HTMLElement, args: unknown) => void
  createTooltipArgs?: unknown
  clickHandlerFunc?: (hotSpotDiv: HTMLElement, args: unknown) => void
  clickHandlerArgs?: unknown
  id?: string
  sceneId?: string
  targetPitch?: number
  targetYaw?: number
  targetHfov?: number
  [key: string]: unknown
}

export interface PannellumViewer {
  destroy: () => void
  on: (event: string, handler: (e?: unknown) => void) => void
  off: (event: string, handler: (e?: unknown) => void) => void
  getYaw: () => number
  setYaw: (yaw: number, animated?: boolean | number) => void
  getPitch: () => number
  setPitch: (pitch: number, animated?: boolean | number) => void
  getHfov: () => number
  setHfov: (hfov: number, animated?: boolean | number) => void
  lookAt: (pitch: number, yaw: number, hfov?: number, animated?: boolean | number) => void
  mouseEventToCoords: (event: MouseEvent | TouchEvent) => [number, number]
  addHotSpot: (hs: PannellumHotSpot, sceneId?: string) => void
  removeHotSpot: (hotSpotId: string, sceneId?: string) => boolean
  toggleFullscreen: () => void
  resize: () => void
  getContainer: () => HTMLElement
  getRenderer?: () => {
    resize: () => void
    getCanvas: () => HTMLCanvasElement | null
    [key: string]: unknown
  }
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
  hotSpots?: PannellumHotSpot[]
  hotSpotDebug?: boolean
  [key: string]: unknown
}

declare global {
  interface Window {
    pannellum?: {
      viewer: (element: HTMLElement, config: PannellumConfig) => PannellumViewer
    }
  }
}
