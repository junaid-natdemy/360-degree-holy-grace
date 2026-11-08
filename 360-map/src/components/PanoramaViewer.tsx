import { useEffect, useRef } from 'react'
import 'pannellum/build/pannellum.css'
import 'pannellum/build/pannellum.js'
import type { PannellumViewer } from '../types/pannellum'

export interface PanoramaViewerProps {
  /** Tiny, blurred preview loaded immediately behind the splash screen. */
  preview: string
  /** 4096px master texture: pixel-perfect Retina clarity on mobile phones and tablets. */
  standard: string
  /** 8192px master texture: ultra-detailed clarity for large desktop screens with high-end GPUs. */
  highRes?: string
  /** Called once the chosen texture has finished loading. */
  onReady?: () => void
  className?: string
}

/** Largest texture this device's WebGL can bind (0 when WebGL is missing). */
function getMaxTextureSize(): number {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return 0
    const size = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return typeof size === 'number' ? size : 0
  } catch {
    return 0
  }
}

/**
 * High-definition texture selector:
 * Keeps 100% crystal-clear original quality without exceeding GPU hardware limits.
 */
function pickSource(standard: string, highRes?: string): string {
  if (!highRes) return standard

  if (typeof window === 'undefined') return standard

  const isMobileScreen = window.innerWidth < 1200 || (window.screen && window.screen.width < 1200)
  const isTouch = Boolean(
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    'ontouchstart' in window
  )
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent
  )

  // On mobile/tablets, 4096x2048 is pixel-perfect 1:1 match with Retina screens (~1138px across 100° FOV).
  // It completely avoids split-texture shader branching in WebGL, guaranteeing 60fps with zero blur.
  if (isMobileScreen || isTouch || isMobileUA) {
    return standard
  }

  // Desktops with capable GPUs bind the full 8192px master panorama
  if (getMaxTextureSize() >= 8192) {
    return highRes
  }

  return standard
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

export default function PanoramaViewer({
  preview,
  standard,
  highRes,
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
    const container = containerRef.current
    if (!container || !window.pannellum) {
      return
    }

    // Keep razor-sharp Retina resolution (DPR 2.0)
    const targetDpr = Math.min(window.devicePixelRatio || 1, 2.0)
    clampRetinaDpr(targetDpr)

    const panoramaSrc = pickSource(standard, highRes)

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

    let viewer: PannellumViewer
    try {
      if (isTouchDevice) {
        delete (window as unknown as { PointerEvent?: unknown }).PointerEvent
      }

      viewer = window.pannellum.viewer(container, {
        type: 'equirectangular',
        panorama: panoramaSrc,
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

    return () => {
      dragFix?.removeEventListener('touchend', handleTouchEnd)
      viewerRef.current = null
      viewer.destroy()
    }
  }, [preview, standard, highRes])

  return <div ref={containerRef} className={className} />
}
