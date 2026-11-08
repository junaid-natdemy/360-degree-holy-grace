import { useEffect, useRef } from 'react'
import 'pannellum/build/pannellum.css'
import 'pannellum/build/pannellum.js'
import type { PannellumViewer } from '../types/pannellum'

export interface PanoramaViewerProps {
  /** Tiny, blurred image painted immediately while the real texture downloads. */
  preview: string
  /** Medium image: fits every GPU, including low-end phones. */
  standard: string
  /** Full-detail image, only used when the device can hold the texture. */
  highRes?: string
  /** Called once the chosen texture has finished loading. */
  onReady?: () => void
  className?: string
}

/** Width of the high-res texture; GPUs below this would fail to bind it. */
const HIGH_RES_TEXTURE_SIZE = 8192

/** Largest texture this device's WebGL can bind (0 when WebGL is missing). */
function getMaxTextureSize(): number {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) {
      return 0
    }
    const size = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return typeof size === 'number' ? size : 0
  } catch {
    return 0
  }
}

/**
 * Decide once, before the viewer starts, which texture to load. Low-memory or
 * data-saving devices get the medium image so they never stall decoding a
 * 130+ megapixel panorama or downloading 27 MB of JPEG.
 */
function pickSource(standard: string, highRes?: string): string {
  if (!highRes) {
    return standard
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }

  if (nav.connection?.saveData) {
    return standard
  }
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory < 4) {
    return standard
  }
  if (getMaxTextureSize() < HIGH_RES_TEXTURE_SIZE) {
    return standard
  }
  return highRes
}

export default function PanoramaViewer({
  preview,
  standard,
  highRes,
  onReady,
  className,
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<PannellumViewer | null>(null)
  // Held in a ref so a new callback identity never recreates the viewer.
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !window.pannellum) {
      return
    }

    const viewer = window.pannellum.viewer(container, {
      type: 'equirectangular',
      panorama: pickSource(standard, highRes),
      preview,
      autoLoad: true,
      compass: true,
      showFullscreenCtrl: true,
      showZoomCtrl: true,
      hfov: 100,
      minHfov: 50,
      maxHfov: 120,
    })

    viewer.on('load', () => onReadyRef.current?.())

    viewerRef.current = viewer

    return () => {
      viewerRef.current = null
      viewer.destroy()
    }
  }, [preview, standard, highRes])

  return <div ref={containerRef} className={className} />
}
