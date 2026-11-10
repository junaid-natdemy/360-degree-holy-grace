import { useState, useEffect, useRef } from 'react'
import PanoramaViewer, { type PanoramaViewerHandle } from './components/PanoramaViewer'
import { WelcomeScreen } from './components/WelcomeScreen'
import { MarkerDetailModal } from './components/MarkerDetailModal'
import { INITIAL_CAMPUS_MARKERS } from './config/initialMarkers'
import type { CampusBuilding } from './types/marker'
import './App.css'

const PANORAMA_PREVIEW = '/panoramas/panorama-preview.webp'
const PANORAMA_STANDARD = '/panoramas/panorama.webp'
const PANORAMA_HD = '/panoramas/pano-8192.webp'
const PANORAMA_FALLBACK = '/panoramas/pano-4096.jpg'
const STORAGE_KEY = 'holy_grace_360_buildings_v10'

function App() {
  const [imageReady, setImageReady] = useState(false)
  const viewerHandleRef = useRef<PanoramaViewerHandle>(null)

  // 30 Verified campus locations and festival stages
  const [buildings] = useState<CampusBuilding[]>(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CAMPUS_MARKERS))
    } catch {
      // ignore
    }
    return INITIAL_CAMPUS_MARKERS
  })

  const [activeMarker, setActiveMarker] = useState<CampusBuilding | null>(null)
  const [focusedMarker, setFocusedMarker] = useState<CampusBuilding | null>(null)
  const [showHint, setShowHint] = useState(true)

  // Auto-dismiss hint after 4s or on first interaction so it never covers mobile view
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 4000)
    const handleDismiss = () => setShowHint(false)
    window.addEventListener('touchstart', handleDismiss, { once: true, passive: true })
    window.addEventListener('mousedown', handleDismiss, { once: true, passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('touchstart', handleDismiss)
      window.removeEventListener('mousedown', handleDismiss)
    }
  }, [])

  const handleSelectMarker = (marker: CampusBuilding) => {
    setFocusedMarker(marker)

    // Modal requirement: NO modal for parking, entrance, stalls, no-stage buildings, exit
    const isExcludedCategory =
      marker.category === 'bike_parking' ||
      marker.category === 'car_parking' ||
      marker.category === 'vip_parking' ||
      marker.category === 'gate' ||
      marker.category === 'commercial'

    const stages = marker.stages || []
    const hasStages =
      !isExcludedCategory &&
      (stages.length > 0 ||
        Boolean(marker.stageBadgeLabel) ||
        marker.category === 'green_room' ||
        marker.category === 'auditorium' ||
        marker.category === 'stage_complex')

    if (hasStages) {
      setActiveMarker(marker)
    } else {
      setActiveMarker(null)
    }
  }

  const handleFocusBuilding = (marker: CampusBuilding) => {
    setFocusedMarker(marker)
    viewerHandleRef.current?.lookAt(marker.pitch, marker.yaw, 65, 1200)
    setActiveMarker(null)
  }

  const handleGoTo2DMap = (e: React.MouseEvent) => {
    // If user navigated from 2D web, going back in history preserves the sequence:
    // Holy Grace Web -> 2D Map -> 360 View, allowing sliding back to 2D then Holy Grace!
    if (document.referrer && document.referrer.includes('holly-grace-map')) {
      e.preventDefault()
      window.history.back()
    }
    // Otherwise standard link href="https://holly-grace-map.vercel.app/" navigates cleanly
  }

  return (
    <main className="panorama-page">
      <PanoramaViewer
        ref={viewerHandleRef}
        className="panorama-viewer"
        preview={PANORAMA_PREVIEW}
        standard={PANORAMA_STANDARD}
        highRes={PANORAMA_HD}
        fallback={PANORAMA_FALLBACK}
        markers={buildings}
        initialPitch={-46.5}
        initialYaw={-66.5}
        initialHfov={typeof window !== 'undefined' && window.innerWidth <= 640 ? 68 : 75}
        focusedMarker={focusedMarker}
        onMarkerClick={handleSelectMarker}
        onReady={() => setImageReady(true)}
      />

      {/* 2D Map Navigation Switcher Button */}
      <a
        href="https://holly-grace-map.vercel.app/"
        className="btn-2d-map"
        onClick={handleGoTo2DMap}
        title="Switch to 2D Campus Map"
        aria-label="Switch to 2D Campus Map"
      >
        <span className="btn-2d-map-icon">🗺️</span>
        <span className="btn-2d-map-label">2D MAP</span>
      </a>

      {/* Detail Modal when user clicks any stage venue */}
      <MarkerDetailModal
        marker={activeMarker}
        onClose={() => setActiveMarker(null)}
        onFocus={(m) => handleFocusBuilding(m)}
      />

      <p className={`panorama-hint ${!showHint ? 'panorama-hint--hidden' : ''}`}>
        Drag to rotate · Pinch or scroll to zoom · Click pins for details
      </p>

      <WelcomeScreen imageReady={imageReady} />
    </main>
  )
}

export default App
