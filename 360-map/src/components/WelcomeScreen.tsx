import { useEffect, useState } from 'react'

interface WelcomeScreenProps {
  /** True once the panorama texture has actually finished loading. */
  imageReady: boolean
}

/** Minimum time the splash stays up, so it never flashes past. */
const DURATION_MS = 3000

/** Safety valve: never trap the user behind the splash if loading fails. */
const STALL_TIMEOUT_MS = 12000

/**
 * Classic white splash. The count runs 1 → 100 over three seconds,
 * then the screen leaves once the panorama texture is ready.
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ imageReady }) => {
  const [percent, setPercent] = useState(1)
  const [mounted, setMounted] = useState(true)
  const [stalled, setStalled] = useState(false)
  const finished = percent >= 100 && (imageReady || stalled)

  useEffect(() => {
    const start = performance.now()
    // A timer rather than requestAnimationFrame: rAF is paused in background
    // tabs, which would otherwise freeze the count and trap the splash screen.
    const id = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / DURATION_MS)
      setPercent(Math.max(1, Math.round(t * 100)))
      if (t >= 1) window.clearInterval(id)
    }, 60)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setStalled(true), STALL_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!finished) return
    const timer = window.setTimeout(() => setMounted(false), 380)
    return () => window.clearTimeout(timer)
  }, [finished])

  if (!mounted) return null

  return (
    <div
      className={`welcome-screen${finished ? ' welcome-screen--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading 360 tour, ${percent} percent`}
    >
      <div className="welcome-screen__inner">
        <img
          src="/holly-grace-logo.png"
          alt="Holy Grace"
          className="welcome-screen__logo"
          draggable={false}
        />

        <p className="welcome-screen__title">Holy Grace</p>
        <p className="welcome-screen__subtitle">360° Campus Tour</p>

        <div className="welcome-screen__progress">
          <div className="welcome-screen__track">
            <div
              className="welcome-screen__bar"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="welcome-screen__percent">{percent}%</p>
        </div>
      </div>
    </div>
  )
}
