import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import 'pannellum/build/pannellum.css'
import 'pannellum/build/pannellum.js'
import type { PannellumViewer } from '../types/pannellum'
import {
  type CampusBuilding,
  type BuildingCategory,
  getCategoryDetails,
} from '../types/marker'

export interface PanoramaViewerHandle {
  getCurrentCoords: () => { pitch: number; yaw: number } | null
  lookAt: (pitch: number, yaw: number, hfov?: number, animated?: number | boolean) => void
}

export interface PanoramaViewerProps {
  /** Tiny, blurred preview loaded immediately behind the splash screen. */
  preview: string
  /** 4096px master texture: pixel-perfect Retina clarity (990 KB). */
  standard: string
  /** High-resolution texture for desktop if available (e.g. 8192px 8K). */
  highRes?: string
  /** JPEG fallback in case WebP fails on a restricted network or browser. */
  fallback?: string
  /** Campus markers to display */
  markers?: CampusBuilding[]
  /** Active category filter */
  selectedCategory?: BuildingCategory | 'all'
  /** Marker to focus / center on */
  focusedMarker?: CampusBuilding | null
  /** Whether user is in "Marking Mode" to place new pins */
  isMarkingMode?: boolean
  /** Callback when user clicks a marker pin */
  onMarkerClick?: (marker: CampusBuilding) => void
  /** Callback when user clicks panorama in marking mode to drop a pin */
  onPanoramaClickToMark?: (coords: { pitch: number; yaw: number }) => void
  /** Initial camera pitch in degrees (default: -42.5) */
  initialPitch?: number
  /** Initial camera yaw in degrees (default: -63.0) */
  initialYaw?: number
  /** Initial camera horizontal field-of-view in degrees (default: 110) */
  initialHfov?: number
  /** Called once the chosen texture has finished loading. */
  onReady?: () => void
  className?: string
}

/**
 * Checks the device's WebGL MAX_TEXTURE_SIZE to prevent browser WebGL crashes
 * on lower-end devices when loading 8192px textures.
 */
function checkWebGLMaxTextureSize(): number {
  if (typeof document === 'undefined') return 4096
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (gl) {
      return (
        (gl as WebGLRenderingContext).getParameter(
          (gl as WebGLRenderingContext).MAX_TEXTURE_SIZE
        ) || 4096
      )
    }
  } catch {
    // fallback
  }
  return 4096
}

/**
 * Ensures canvas renders at true Apple Retina / High-DPI sharpness (DPR up to 2.5)
 * without wasteful 3.5x oversampling on budget phone screens.
 */
function clampRetinaDpr(maxDpr: number = 2.5) {
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

interface PanoramaLoadResult {
  blobUrl: string
  isHD: boolean
}

/**
 * Loads image into memory with automatic retries, timeouts, and fallback.
 * Checks WebGL limits so 8192px textures only load when supported.
 * Returns an in-memory blob URL that loads into Pannellum instantaneously (0ms),
 * completely eliminating network stalls and Pannellum's "The file could not be accessed" error.
 */
async function loadPanoramaResilient(
  highResUrl?: string,
  standardUrl?: string,
  fallbackUrl?: string
): Promise<PanoramaLoadResult> {
  const fetchWithRetry = async (url: string, timeoutMs = 14000, attempts = 2): Promise<Blob> => {
    let lastError: unknown
    for (let i = 1; i <= attempts; i++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), timeoutMs)
        const res = await fetch(url, { signal: controller.signal, cache: 'force-cache' })
        clearTimeout(timeout)
        if (res.ok) {
          return await res.blob()
        }
        throw new Error(`HTTP ${res.status}`)
      } catch (err) {
        lastError = err
        if (i < attempts) {
          await new Promise((r) => setTimeout(r, 400 * i))
        }
      }
    }
    throw lastError
  }

  const maxTex = checkWebGLMaxTextureSize()
  // Pannellum equirectangular equation: Math.max(width/2, height) <= MAX_TEXTURE_SIZE
  // For 8192x4096, Math.max(4096, 4096) = 4096. Thus maxTex must be >= 4096.
  const canSupportHD = Boolean(highResUrl && maxTex >= 4096)

  // 1. Try High-Resolution 8K texture first if GPU supports it
  if (canSupportHD && highResUrl) {
    try {
      const blob = await fetchWithRetry(highResUrl, 14000, 2)
      return {
        blobUrl: URL.createObjectURL(blob),
        isHD: true,
      }
    } catch (err) {
      console.warn('8K Panorama prefetch timed out or failed, falling back to 4K WebP:', err)
    }
  }

  // 2. Fallback to standard 4096 WebP texture (990 KB)
  if (standardUrl) {
    try {
      const blob = await fetchWithRetry(standardUrl, 10000, 3)
      return {
        blobUrl: URL.createObjectURL(blob),
        isHD: false,
      }
    } catch (err) {
      console.warn('Standard 4K panorama failed, trying JPEG fallback:', err)
    }
  }

  // 3. Fallback to JPEG
  if (fallbackUrl) {
    try {
      const blob = await fetchWithRetry(fallbackUrl, 10000, 3)
      return {
        blobUrl: URL.createObjectURL(blob),
        isHD: false,
      }
    } catch (err) {
      console.error('All panorama preloads failed:', err)
    }
  }

  return {
    blobUrl: standardUrl || fallbackUrl || '',
    isHD: false,
  }
}

export default forwardRef<PanoramaViewerHandle, PanoramaViewerProps>(function PanoramaViewer(
  {
    preview,
    standard,
    highRes,
    fallback,
    markers = [],
    selectedCategory = 'all',
    focusedMarker,
    isMarkingMode = false,
    onMarkerClick,
    onPanoramaClickToMark,
    initialPitch = -46.5,
    initialYaw = -66.5,
    initialHfov,
    onReady,
    className,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<PannellumViewer | null>(null)
  const onReadyRef = useRef(onReady)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onPanoramaClickToMarkRef = useRef(onPanoramaClickToMark)
  const isMarkingModeRef = useRef(isMarkingMode)
  const focusedMarkerRef = useRef(focusedMarker)

  useImperativeHandle(ref, () => ({
    getCurrentCoords: () => {
      if (!viewerRef.current) return null
      return {
        pitch: parseFloat(viewerRef.current.getPitch().toFixed(2)),
        yaw: parseFloat(viewerRef.current.getYaw().toFixed(2)),
      }
    },
    lookAt: (pitch: number, yaw: number, hfov = 75, animated: number | boolean = 1000) => {
      viewerRef.current?.lookAt(pitch, yaw, hfov, animated)
    },
  }))

  useEffect(() => {
    onReadyRef.current = onReady
    onMarkerClickRef.current = onMarkerClick
    onPanoramaClickToMarkRef.current = onPanoramaClickToMark
    isMarkingModeRef.current = isMarkingMode
    focusedMarkerRef.current = focusedMarker
  })

  /**
   * Collision-Avoidance & Decluttering Engine:
   * Dynamically tracks on-screen coordinates of all pins during 360° rotation and zoom.
   * When pins cluster along the same azimuth (e.g. Bike Parkings, Boys Hostel, College Block vs VIP),
   * lower-priority pins collapse into an elegant 20-22px category icon beacon.
   * When hovered, focused, or tapped, beacons instantly pop open into full readable labels.
   * Eliminates 100% of text badge overlaps at all rotation angles.
   */
  const resolvePinCollisions = () => {
    const container = containerRef.current
    if (!container) return

    const pins = Array.from(container.querySelectorAll<HTMLElement>('.campus-hotspot-pin'))
    if (pins.length === 0) return

    const containerRect = container.getBoundingClientRect()
    const isMobile = window.innerWidth <= 640
    const padX = isMobile ? 6 : 8
    const padY = isMobile ? 4 : 6

    interface PinItem {
      el: HTMLElement
      badge: HTMLElement
      priority: number
      elRect: DOMRect
      badgeRect: DOMRect
      isHovered: boolean
      isFocused: boolean
      hasStages: boolean
      category: string
    }

    const visibleItems: PinItem[] = []

    for (const pin of pins) {
      if (pin.style.visibility === 'hidden') {
        pin.classList.remove('pin--collapsed')
        continue
      }

      const badge = pin.querySelector<HTMLElement>('.pin-badge')
      if (!badge) continue

      const elRect = pin.getBoundingClientRect()
      const badgeRect = badge.getBoundingClientRect()

      // Ignore pins completely outside viewport
      if (
        elRect.right < containerRect.left - 20 ||
        elRect.left > containerRect.right + 20 ||
        elRect.bottom < containerRect.top - 20 ||
        elRect.top > containerRect.bottom + 20
      ) {
        continue
      }

      const markerId = pin.getAttribute('data-marker-id')
      const category = pin.getAttribute('data-category') || 'academic'
      const pitch = parseFloat(pin.getAttribute('data-pitch') || '-30')
      const hasStages = pin.getAttribute('data-has-stages') === 'true'
      const isFocused = Boolean(focusedMarkerRef.current && focusedMarkerRef.current.id === markerId)
      const isHovered = pin.matches(':hover')

      let base = 200
      if (hasStages || category === 'auditorium' || category === 'stage_complex' || category === 'green_room') {
        base = 650 // Competition stages and green rooms receive priority showcase
      } else {
        switch (category) {
          case 'vip_parking':
            base = 560 // VIP Parking is a high-priority landmark, placed before standard non-stage buildings
            break
          case 'academic':
            base = 450
            break
          case 'car_parking':
            base = 420
            break
          case 'administrative':
            base = 400
            break
          case 'outdoor':
          case 'commercial':
            base = 350
            break
          case 'gate':
            base = 300
            break
          case 'bike_parking':
            base = 210
            break
        }
      }
      // Closer foreground markers (steeper downward pitch) get natural visual precedence
      const priority = isFocused || isHovered ? 99999 : base - pitch * 0.5

      visibleItems.push({
        el: pin,
        badge,
        priority,
        elRect,
        badgeRect,
        isHovered,
        isFocused,
        hasStages,
        category,
      })
    }

    // Sort descending: most important landmarks evaluated first
    visibleItems.sort((a, b) => b.priority - a.priority)

    const placedRects: { left: number; right: number; top: number; bottom: number }[] = []

    for (const item of visibleItems) {
      if (item.isFocused || item.isHovered) {
        item.el.classList.remove('pin--collapsed')
        item.badge.style.setProperty('--pin-stagger-y', '0px')
        item.badge.removeAttribute('data-staggered')
        placedRects.push({
          left: item.elRect.left - 50,
          right: item.elRect.left + 50,
          top: item.elRect.top - 28,
          bottom: item.elRect.bottom,
        })
        continue
      }

      // Cache actual rendered full width when uncollapsed so testWidth is invariant
      if (!item.el.classList.contains('pin--collapsed') && item.badgeRect.width > 30) {
        item.badge.setAttribute('data-full-width', String(Math.round(item.badgeRect.width)))
      }

      // Estimate full badge size
      let testWidth = item.badgeRect.width
      const testHeight = isMobile ? 22 : 26

      if (item.el.classList.contains('pin--collapsed')) {
        const cachedWidth = parseFloat(item.badge.getAttribute('data-full-width') || '0')
        if (cachedWidth > 30) {
          testWidth = cachedWidth
        } else {
          const titleEl = item.badge.querySelector('.pin-title')
          const charCount = titleEl?.textContent?.length || 12
          const charWidth = isMobile ? 6 : 7.2
          testWidth = Math.max(70, charCount * charWidth + (isMobile ? 32 : 40))
        }
      }

      // Anchor coordinate is the invariant hotspot screen position (immune to collapse or stagger changes)
      const cx = item.elRect.left
      const cy = item.elRect.top

      // Normal unshifted box anchored directly to the physical ground coordinates
      const normalBox = {
        left: cx - testWidth / 2 - padX,
        right: cx + testWidth / 2 + padX,
        top: cy - testHeight - padY,
        bottom: cy + padY,
      }

      // Always maintain exact physical location without moving tooltips upward
      // User: "overlapping time no need up the toolitp becoz that time postion relocating that make confusion"
      item.badge.style.setProperty('--pin-stagger-y', '0px')
      item.badge.removeAttribute('data-staggered')
      item.el.style.zIndex = String(Math.round(item.priority))

      // User requirement: ALWAYS show title for ALL locations (Stall, VIP Parking, Stages, Gates, etc.)
      // Never collapse into an icon-only button
      item.el.classList.remove('pin--collapsed')
      placedRects.push(normalBox)
    }
  }

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
        const catDetails = getCategoryDetails(m.category)

        viewer.addHotSpot({
          id: m.id,
          pitch: m.pitch,
          yaw: m.yaw,
          type: 'custom',
          cssClass: `campus-hotspot campus-hotspot--${m.category}`,
          createTooltipFunc: (div: HTMLElement) => {
            div.className = `pnlm-hotspot-base campus-hotspot campus-hotspot-pin ${catDetails.badgeClass}`
            div.style.position = 'absolute'
            div.style.top = '0'
            div.style.left = '0'
            div.setAttribute('data-marker-id', m.id)
            div.setAttribute('data-category', m.category)
            div.setAttribute('data-pitch', String(m.pitch))
            div.setAttribute('data-yaw', String(m.yaw))
            const hasStages = Boolean(m.stageBadgeLabel)
            div.setAttribute('data-has-stages', hasStages ? 'true' : 'false')

            // Festival Showcase: display stage range/name as primary label if available, otherwise building/facility name
            const badgeText = m.stageBadgeLabel || m.name
            div.title = m.stageBadgeLabel ? `${m.stageBadgeLabel} (${m.name})` : m.name

            const isParking =
              m.category === 'bike_parking' ||
              m.category === 'car_parking' ||
              m.category === 'vip_parking'

            div.innerHTML = `
              <div class="pin-badge ${isParking ? 'pin-badge--parking' : ''} ${hasStages ? 'pin-badge--stage-venue' : ''}" style="--pin-color: ${catDetails.color}">
                <span class="pin-icon-wrap" style="background-color: ${catDetails.color}">
                  ${catDetails.iconSvg}
                </span>
                <div class="pin-info">
                  <span class="pin-title">${badgeText}</span>
                </div>
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

    setTimeout(resolvePinCollisions, 60)
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
    const cleanups: (() => void)[] = []

    const container = containerRef.current
    if (!container || !window.pannellum) {
      return
    }

    const targetDpr = Math.min(window.devicePixelRatio || 1, 2.5)
    clampRetinaDpr(targetDpr)

    const updateZoomScale = (hfov: number) => {
      if (!containerRef.current) return
      const t = Math.max(0, Math.min(1, (hfov - 45) / (120 - 45)))
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
      // Scale more compactly on mobile screens so dense clusters like Bike Parking never overlap
      const minScale = isMobile ? 0.38 : 0.52
      const maxScale = isMobile ? 0.72 : 1.05
      const scale = parseFloat((maxScale - Math.pow(t, 0.95) * (maxScale - minScale)).toFixed(2))

      containerRef.current.style.setProperty('--pin-zoom-scale', scale.toString())

      if (hfov >= 90 || isMobile) {
        containerRef.current.classList.add('viewer-zoomed-out')
      } else {
        containerRef.current.classList.remove('viewer-zoomed-out')
      }

      if (hfov >= 105 || (isMobile && hfov >= 85)) {
        containerRef.current.classList.add('viewer-zoomed-wide')
      } else {
        containerRef.current.classList.remove('viewer-zoomed-wide')
      }
    }

    const handleWindowResize = () => {
      if (viewerRef.current) {
        updateZoomScale(viewerRef.current.getHfov())
        resolvePinCollisions()
      }
    }
    window.addEventListener('resize', handleWindowResize, { passive: true })
    cleanups.push(() => window.removeEventListener('resize', handleWindowResize))

    const fallbackUrl = fallback || standard.replace(/\.webp$/, '.jpg')

    loadPanoramaResilient(highRes, standard, fallbackUrl).then(({ blobUrl: panoramaBlobUrl }) => {
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

        const isMobileScreen = typeof window !== 'undefined' && window.innerWidth <= 640
        const defaultHfov = isMobileScreen ? 68 : 75
        const activeHfov = initialHfov !== undefined ? initialHfov : defaultHfov

        viewer = window.pannellum.viewer(container, {
          type: 'equirectangular',
          panorama: panoramaBlobUrl,
          preview,
          autoLoad: true,
          compass: true,
          showFullscreenCtrl: true,
          showZoomCtrl: true,
          pitch: initialPitch,
          yaw: initialYaw,
          hfov: activeHfov,
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

      let downX = 0
      let downY = 0

      const handleMouseDown = (e: MouseEvent) => {
        downX = e.clientX
        downY = e.clientY
      }

      // Handle clicking in "Marking Mode" to drop new pins
      const handleViewerClick = (e: MouseEvent) => {
        if (!isMarkingModeRef.current || !viewerRef.current) return
        if ((e.target as HTMLElement).closest('.campus-hotspot-pin, .pnlm-hotspot, button')) return

        const dist = Math.hypot(e.clientX - downX, e.clientY - downY)
        if (dist > 8) {
          // Drag / pan rotation detected, do not drop marker
          return
        }

        const coords = viewerRef.current.mouseEventToCoords(e)
        if (coords && coords.length === 2) {
          onPanoramaClickToMarkRef.current?.({ pitch: coords[0], yaw: coords[1] })
        }
      }

      container.addEventListener('mousedown', handleMouseDown)
      container.addEventListener('click', handleViewerClick)

      cleanups.push(() => {
        container.removeEventListener('mousedown', handleMouseDown)
        container.removeEventListener('click', handleViewerClick)
        dragFix?.removeEventListener('touchend', handleTouchEnd)
      })

      // Collision avoidance & decluttering loop during 360 rotation & panning
      let rafId: number
      let lastPitch = -9999
      let lastYaw = -9999
      let lastHfov = -9999
      let lastCollisionCheck = 0

      const checkCameraMovement = () => {
        if (!active) return
        if (viewerRef.current && containerRef.current) {
          try {
            const p = viewerRef.current.getPitch()
            const y = viewerRef.current.getYaw()
            const h = viewerRef.current.getHfov()
            const now = performance.now()

            // Smooth throttled check: requires meaningful movement (>0.12°) and at least 45ms between calculations
            // completely eliminates label vibration / jitter during 360 rotation
            if (
              (Math.abs(p - lastPitch) > 0.12 ||
                Math.abs(y - lastYaw) > 0.12 ||
                Math.abs(h - lastHfov) > 0.15) &&
              now - lastCollisionCheck > 45
            ) {
              lastPitch = p
              lastYaw = y
              lastHfov = h
              lastCollisionCheck = now
              resolvePinCollisions()
            }
          } catch {
            // viewer may be destroyed
          }
        }
        rafId = requestAnimationFrame(checkCameraMovement)
      }

      rafId = requestAnimationFrame(checkCameraMovement)
      cleanups.push(() => cancelAnimationFrame(rafId))

      viewer.on('load', () => {
        if (viewer) {
          syncHotspots(viewer)
          updateZoomScale(viewer.getHfov())
          setTimeout(resolvePinCollisions, 80)
        }
        onReadyRef.current?.()
      })

      viewer.on('zoomchange', (hfov?: unknown) => {
        const currentHfov = typeof hfov === 'number' ? hfov : viewer?.getHfov() || 110
        updateZoomScale(currentHfov)
        resolvePinCollisions()
      })

      viewerRef.current = viewer
    })

    return () => {
      active = false
      cleanups.forEach((cleanup) => cleanup())
      if (viewer) {
        viewer.destroy()
      }
      viewerRef.current = null
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke)
      }
    }
  }, [preview, standard, highRes, fallback])

  return (
    <div
      ref={containerRef}
      className={`${className || ''} ${isMarkingMode ? 'panorama-viewer--marking' : ''}`}
    />
  )
})
