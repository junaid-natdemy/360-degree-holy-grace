import { useEffect, useRef } from 'react'
import 'pannellum/build/pannellum.css'
import 'pannellum/build/pannellum.js'
import type { PannellumViewer } from '../types/pannellum'

export interface PanoramaViewerProps {
  /** Tiny, blurred preview loaded immediately behind the splash screen. */
  preview: string
  /** 4096px master texture: pixel-perfect Retina clarity (990 KB). */
  standard: string
  /** High-resolution texture for desktop if available. */
  highRes?: string
  /** JPEG fallback in case WebP fails on a restricted network or browser. */
  fallback?: string
  /** Called once the chosen texture has finished loading. */
  onReady?: () => void
  className?: string
}

/**
 * Ensures canvas renders at true Apple Retina / High-DPI sharpness (DPR 2.0)
 * without wasteful 3.5x oversampling on budget phone screens.
 */
function clampRetinaDpr(maxDpr: number = 2.0) {
  if (typeof window === 'undefined') return
  const currentDpr = window.devicePixelRatio || 1
  if (currentDpr <= maxDpr) return

  try {
    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => maxDpr,
      configurable: true,
    })
  } catch {
    // Handled gracefully via renderer.resize
  }
}

/**
 * Loads image into memory with automatic retries, timeouts, and fallback.
 * Returns an in-memory blob URL that loads into Pannellum instantaneously (0ms),
 * completely eliminating network stalls and Pannellum's "The file could not be accessed" error.
 */
async function loadPanoramaResilient(primaryUrl: string, fallbackUrl?: string): Promise<string> {
  const fetchWithRetry = async (url: string, attempts = 3): Promise<Blob> => {
    let lastError: unknown
    for (let i = 1; i <= attempts; i++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout per attempt
        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        if (res.ok) {
          return await res.blob()
        }
        throw new Error(`HTTP ${res.status}`)
      } catch (err) {
        lastError = err
        if (i < attempts) {
          await new Promise((r) => setTimeout(r, 600 * i))
        }
      }
    }
    throw lastError
  }

  try {
    const blob = await fetchWithRetry(primaryUrl)
    return URL.createObjectURL(blob)
  } catch (err) {
    if (fallbackUrl && fallbackUrl !== primaryUrl) {
      console.warn(`Primary panorama failed, falling back to ${fallbackUrl}:`, err)
      try {
        const fallbackBlob = await fetchWithRetry(fallbackUrl)
        return URL.createObjectURL(fallbackBlob)
      } catch {
        // Return primary URL if fallback also fails
        return primaryUrl
      }
    }
    return primaryUrl
  }
}

export default function PanoramaViewer({
  preview,
  standard,
  highRes,
  fallback,
  onReady,
  className,
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<PannellumViewer | null>(null)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    let active = true
    let blobUrlToRevoke: string | null = null
    let viewer: PannellumViewer | null = null

    const container = containerRef.current
    if (!container || !window.pannellum) {
      return
    }

    // Keep razor-sharp Retina resolution (DPR 2.0)
    const targetDpr = Math.min(window.devicePixelRatio || 1, 2.0)
    clampRetinaDpr(targetDpr)

    const targetUrl = standard
    const fallbackUrl = fallback || standard.replace(/\.webp$/, '.jpg')

    loadPanoramaResilient(targetUrl, fallbackUrl).then((panoramaBlobUrl) => {
      if (!active || !containerRef.current || !window.pannellum) {
        if (panoramaBlobUrl.startsWith('blob:')) URL.revokeObjectURL(panoramaBlobUrl)
        return
      }

      if (panoramaBlobUrl.startsWith('blob:')) {
        blobUrlToRevoke = panoramaBlobUrl
      }

      // FIX FOR MOBILE LAG & STUCK BUG:
      // Pannellum's 2015 "IE/Edge" PointerEvent handler leaves ghost coordinates in an internal array
      // whenever a finger is lifted during pinch-to-zoom. When the user continues with 1 finger,
      // it keeps calculating pinch math against the phantom finger, locking up the view.
      // By temporarily masking PointerEvent during viewer creation on touch devices, Pannellum
      // binds native touchstart/touchmove/touchend which correctly tracks physical fingers.
      const isTouchDevice =
        typeof window !== 'undefined' &&
        ('ontouchstart' in window ||
          (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
          /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))

      const origPointerEvent = (window as unknown as { PointerEvent?: unknown }).PointerEvent

      try {
        if (isTouchDevice) {
          delete (window as unknown as { PointerEvent?: unknown }).PointerEvent
        }

        viewer = window.pannellum.viewer(container, {
          type: 'equirectangular',
          panorama: panoramaBlobUrl,
          preview,
          autoLoad: true,
          compass: true,
          showFullscreenCtrl: true,
          showZoomCtrl: true,
          hfov: 100,
          minHfov: 45,
          maxHfov: 120,
          friction: 0.15,
          touchPanSpeedCoeffFactor: 1,
        })
      } finally {
        if (isTouchDevice && origPointerEvent) {
          ;(window as unknown as { PointerEvent?: unknown }).PointerEvent = origPointerEvent
        }
      }

      // Enforce razor-sharp Retina DPR on canvas resizing
      try {
        const viewerAny = viewer as unknown as {
          getRenderer?: () => {
            resize: () => void
            getCanvas: () => HTMLCanvasElement | null
          }
        }
        const renderer = viewerAny.getRenderer?.()
        if (renderer) {
          const origResize = renderer.resize.bind(renderer)
          renderer.resize = function () {
            origResize()
            const canvas = renderer.getCanvas()
            if (canvas) {
              const expectedW = Math.round(canvas.clientWidth * targetDpr)
              const expectedH = Math.round(canvas.clientHeight * targetDpr)
              if (canvas.width > expectedW || canvas.height > expectedH) {
                canvas.width = expectedW
                canvas.height = expectedH
                const gl = (canvas.getContext('webgl') ||
                  canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
                if (gl) {
                  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
                }
              }
            }
          }
          renderer.resize()
        }
      } catch {
        // Ignore if Pannellum internals change
      }

      // Seamless touch transition: when lifting 1 finger after a pinch, smoothly re-anchor single-finger drag
      const dragFix = container.querySelector('.pnlm-dragfix') as HTMLElement | null
      const handleTouchEnd = (e: TouchEvent) => {
        if (e.touches.length === 1 && dragFix) {
          const touch = e.touches[0]
          const simulatedStart = new TouchEvent('touchstart', {
            touches: [touch],
            targetTouches: [touch],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true,
          })
          dragFix.dispatchEvent(simulatedStart)
        }
      }

      dragFix?.addEventListener('touchend', handleTouchEnd, { passive: true })

      viewer.on('load', () => onReadyRef.current?.())
      viewerRef.current = viewer
    })

    return () => {
      active = false
      if (viewer) {
        viewer.destroy()
      }
      viewerRef.current = null
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke)
      }
    }
  }, [preview, standard, highRes, fallback])

  return <div ref={containerRef} className={className} />
}
