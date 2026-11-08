import { useEffect, useRef } from 'react'
import 'pannellum/build/pannellum.css'
import 'pannellum/build/pannellum.js'
import type { PannellumViewer } from '../types/pannellum'

export interface PanoramaViewerProps {
  /** Tiny, blurred image painted immediately while the real texture downloads. */
  preview: string
  /** 2048px texture: specifically optimized for mobile and low-end GPUs to prevent rotation/zoom lag. */
  mobile?: string
  /** Medium image (4096px): fits mid-range phones, tablets, and laptops. */
  standard: string
  /** Full-detail image (8192px): only used on high-spec desktop displays with capable GPUs. */
  highRes?: string
  /** Called once the chosen texture has finished loading. */
  onReady?: () => void
  className?: string
}

export interface DeviceProfile {
  tier: 'low' | 'mid' | 'high'
  targetDpr: number
  friction: number
  compass: boolean
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
 * Checks for known low-end mobile / integrated GPUs with limited fill-rate
 * or narrow memory bus that struggle with high-resolution equirectangular sampling.
 */
function isLowTierGPU(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return true
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      const renderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      if (/mali-4|mali-t|mali-g3|mali-g51|mali-g52|adreno\s*(3|4|5|610|612|615|616)|powervr/i.test(renderer)) {
        return true
      }
    } else {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  } catch {
    // ignore
  }
  return false
}

/**
 * Analyzes device memory, CPU cores, screen dimensions, GPU and user agent
 * to categorize the device into 'low', 'mid', or 'high'.
 */
function detectDeviceProfile(): DeviceProfile {
  if (typeof window === 'undefined') {
    return { tier: 'mid', targetDpr: 1, friction: 0.15, compass: false }
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }

  const isTouch = Boolean(
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    'ontouchstart' in window
  )
  const isMobileScreen = window.innerWidth <= 820 || (window.screen && window.screen.width <= 820)
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent
  )
  const isMobile = isMobileUA || (isTouch && isMobileScreen)

  const ram = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined
  const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : undefined
  const saveData = Boolean(nav.connection?.saveData)
  const maxTex = getMaxTextureSize()
  const lowGPU = isLowTierGPU()

  // Low-tier conditions:
  // 1. User has "Save Data" turned on
  // 2. GPU reported as known low-tier mobile chip
  // 3. WebGL max texture size is under 8192
  // 4. Low RAM (<= 4 GB on Android)
  // 5. Mobile device with <= 4 CPU cores or small screen width
  const isLowTier =
    saveData ||
    lowGPU ||
    (maxTex > 0 && maxTex < 8192) ||
    (typeof ram === 'number' && ram > 0 && ram <= 4) ||
    (isMobile && typeof cores === 'number' && cores <= 4) ||
    (isMobile && window.innerWidth <= 540)

  if (isLowTier) {
    return {
      tier: 'low',
      // Capping DPR to 1.15 slashes fragment shader fill-rate workload by up to 80% on 1080p+ mobile screens,
      // avoiding GPU throttling while keeping visuals crisp.
      targetDpr: Math.min(window.devicePixelRatio || 1, 1.15),
      // Higher friction halts rotation quickly, preventing touch queue momentum lag/stuck feeling.
      friction: 0.22,
      compass: false,
    }
  }

  if (isMobile) {
    return {
      tier: 'mid',
      targetDpr: Math.min(window.devicePixelRatio || 1, 1.5),
      friction: 0.18,
      compass: true,
    }
  }

  // Desktop / Laptop detection
  const isHighEndDesktop =
    !isTouch &&
    window.innerWidth >= 1200 &&
    maxTex >= 8192 &&
    (typeof ram === 'undefined' || ram >= 8) &&
    (typeof cores === 'undefined' || cores >= 6)

  if (isHighEndDesktop) {
    return {
      tier: 'high',
      targetDpr: Math.min(window.devicePixelRatio || 1, 2.0),
      friction: 0.15,
      compass: true,
    }
  }

  return {
    tier: 'mid',
    targetDpr: Math.min(window.devicePixelRatio || 1, 1.5),
    friction: 0.15,
    compass: true,
  }
}

/**
 * Clamps window.devicePixelRatio before Pannellum initializes so its internal canvas
 * constructor does not allocate an oversized WebGL drawing buffer on high-DPI budget phones.
 */
function clampDevicePixelRatio(targetDpr: number) {
  if (typeof window === 'undefined') return
  const currentDpr = window.devicePixelRatio || 1
  if (currentDpr <= targetDpr) return

  try {
    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => targetDpr,
      configurable: true,
    })
  } catch {
    // If not configurable, fallback is handled via renderer.resize
  }
}

/**
 * Choose the optimal texture resolution for this device's tier.
 */
function pickSource(
  profile: DeviceProfile,
  mobile?: string,
  standard?: string,
  highRes?: string
): string {
  const fallback = standard || mobile || highRes || ''
  if (profile.tier === 'low') {
    return mobile || fallback
  }
  if (profile.tier === 'high' && highRes) {
    return highRes
  }
  return fallback
}

export default function PanoramaViewer({
  preview,
  mobile,
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

    const profile = detectDeviceProfile()
    clampDevicePixelRatio(profile.targetDpr)

    const panoramaSrc = pickSource(profile, mobile, standard, highRes)

    const viewer = window.pannellum.viewer(container, {
      type: 'equirectangular',
      panorama: panoramaSrc,
      preview,
      autoLoad: true,
      compass: profile.compass,
      showFullscreenCtrl: true,
      showZoomCtrl: true,
      hfov: 100,
      minHfov: 50,
      maxHfov: 120,
      friction: profile.friction,
      touchPanSpeedCoeffFactor: 1,
    })

    // Double safeguard: ensure renderer.resize strictly respects targetDpr on orientation/screen changes
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
            const expectedW = Math.round(canvas.clientWidth * profile.targetDpr)
            const expectedH = Math.round(canvas.clientHeight * profile.targetDpr)
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

    viewer.on('load', () => onReadyRef.current?.())

    viewerRef.current = viewer

    return () => {
      viewerRef.current = null
      viewer.destroy()
    }
  }, [preview, mobile, standard, highRes])

  return <div ref={containerRef} className={className} />
}
