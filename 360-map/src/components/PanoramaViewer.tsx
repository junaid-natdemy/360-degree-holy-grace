import { useEffect, useRef } from 'react'
import 'pannellum/build/pannellum.css'
import 'pannellum/build/pannellum.js'
import type { PannellumViewer } from '../types/pannellum'
import type { CampusMarker, MarkerCategory } from '../types/marker'

export interface PanoramaViewerProps {
  /** Tiny, blurred preview loaded immediately behind the splash screen. */
  preview: string
  /** 4096px master texture: pixel-perfect Retina clarity (990 KB). */
  standard: string
  /** High-resolution texture for desktop if available. */
  highRes?: string
  /** JPEG fallback in case WebP fails on a restricted network or browser. */
  fallback?: string
  /** Campus markers to display */
  markers?: CampusMarker[]
  /** Active category filter */
  selectedCategory?: MarkerCategory | 'all'
  /** Marker to focus / center on */
  focusedMarker?: CampusMarker | null
  /** Whether user is in "Marking Mode" to place new pins */
  isMarkingMode?: boolean
  /** Callback when user clicks a marker pin */
  onMarkerClick?: (marker: CampusMarker) => void
  /** Callback when user clicks panorama in marking mode to drop a pin */
  onPanoramaClickToMark?: (coords: { pitch: number; yaw: number }) => void
  /** Called once the chosen texture has finished loading. */
  onReady?: () => void
  className?: string
}

function getCategoryIcon(cat: MarkerCategory): string {
  switch (cat) {
    case 'building_with_stages':
      return '🏢'
    case 'building':
      return '🏛️'
    case 'area_with_stages':
      return '🎪'
    case 'area':
      return '📍'
  }
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
        const timeout = setTimeout(() => controller.abort(), 8000)
        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        if (res.ok) {
          return await res.blob()
        }
        throw new Error(`HTTP ${res.status}`)
      } catch (err) {
        lastError = err
        if (i < attempts) {
          await new Promise((r) => setTimeout(r, 500 * i))
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
        return primaryUrl
      }
    }
    return primaryUrl
  }
}

export default function PanoramaViewer({
  preview,
  standard,
  fallback,
  markers = [],
  selectedCategory = 'all',
  focusedMarker,
  isMarkingMode = false,
  onMarkerClick,
  onPanoramaClickToMark,
  onReady,
  className,
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<PannellumViewer | null>(null)
  const onReadyRef = useRef(onReady)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onPanoramaClickToMarkRef = useRef(onPanoramaClickToMark)
  const isMarkingModeRef = useRef(isMarkingMode)

  useEffect(() => {
    onReadyRef.current = onReady
    onMarkerClickRef.current = onMarkerClick
    onPanoramaClickToMarkRef.current = onPanoramaClickToMark
    isMarkingModeRef.current = isMarkingMode
  })

  // Synchronize hotspots whenever markers list or category filter changes
  const syncHotspots = (viewer: PannellumViewer) => {
    const activeMarkers = markers.filter(
      (m) => selectedCategory === 'all' || m.category === selectedCategory
    )

    // Clear existing custom hotSpots
    markers.forEach((m) => {
      try {
        viewer.removeHotSpot(m.id)
      } catch {
        // ignore
      }
    })

    // Add filtered hotSpots
    activeMarkers.forEach((m) => {
      try {
        viewer.addHotSpot({
          id: m.id,
          pitch: m.pitch,
          yaw: m.yaw,
          type: 'custom',
          cssClass: `campus-hotspot campus-hotspot--${m.category}`,
          createTooltipFunc: (div: HTMLElement) => {
            div.className = `campus-hotspot-pin campus-hotspot-pin--${m.category}`
            const icon = getCategoryIcon(m.category)
            const label = m.badgeLabel || m.name
            div.innerHTML = `
              <div class="pin-badge">
                <span class="pin-icon">${icon}</span>
                <span class="pin-title">${label}</span>
              </div>
            `
          },
          clickHandlerFunc: () => {
            onMarkerClickRef.current?.(m)
          },
        })
      } catch (e) {
        console.warn('Failed to add hotspot:', m.name, e)
      }
    })
  }

  // Smoothly focus on marker when selected
  useEffect(() => {
    if (focusedMarker && viewerRef.current) {
      viewerRef.current.lookAt(focusedMarker.pitch, focusedMarker.yaw, 65, 1200)
    }
  }, [focusedMarker])

  // Update hotspots when markers or filter changes
  useEffect(() => {
    if (viewerRef.current) {
      syncHotspots(viewerRef.current)
    }
  }, [markers, selectedCategory])

  // Initialize Pannellum viewer
  useEffect(() => {
    let active = true
    let blobUrlToRevoke: string | null = null
    let viewer: PannellumViewer | null = null

    const container = containerRef.current
    if (!container || !window.pannellum) {
      return
    }

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

      // Enforce razor-sharp Retina DPR
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
        // ignore
      }

      // Handle touch transition
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

      // Handle clicking in "Marking Mode" to drop new pins
      const handleViewerClick = (e: MouseEvent) => {
        if (!isMarkingModeRef.current || !viewerRef.current) return
        if ((e.target as HTMLElement).closest('.campus-hotspot-pin, .pnlm-hotspot, button')) return

        const coords = viewerRef.current.mouseEventToCoords(e)
        if (coords && coords.length === 2) {
          onPanoramaClickToMarkRef.current?.({ pitch: coords[0], yaw: coords[1] })
        }
      }

      container.addEventListener('click', handleViewerClick)

      viewer.on('load', () => {
        if (viewer) syncHotspots(viewer)
        onReadyRef.current?.()
      })

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
  }, [preview, standard, fallback])

  return (
    <div
      ref={containerRef}
      className={`${className || ''} ${isMarkingMode ? 'panorama-viewer--marking' : ''}`}
    />
  )
}
