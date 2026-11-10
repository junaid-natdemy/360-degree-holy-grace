import { useState, useEffect } from 'react'
import PanoramaViewer from './components/PanoramaViewer'
import { WelcomeScreen } from './components/WelcomeScreen'
import { MarkerFilterBar } from './components/MarkerFilterBar'
import { MarkerDetailModal } from './components/MarkerDetailModal'
import { MarkerEditorModal } from './components/MarkerEditorModal'
import { INITIAL_CAMPUS_MARKERS } from './config/initialMarkers'
import type { CampusMarker, MarkerCategory } from './types/marker'
import './App.css'

const PANORAMA_PREVIEW = '/panoramas/panorama-preview.webp'
const PANORAMA_STANDARD = '/panoramas/panorama.webp'
const PANORAMA_FALLBACK = '/panoramas/pano-4096.jpg'
const STORAGE_KEY = 'holy_grace_360_custom_markers'

function App() {
  const [imageReady, setImageReady] = useState(false)
  const [markers, setMarkers] = useState<CampusMarker[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_CAMPUS_MARKERS
  })

  const [selectedCategory, setSelectedCategory] = useState<MarkerCategory | 'all'>('all')
  const [activeMarker, setActiveMarker] = useState<CampusMarker | null>(null)
  const [focusedMarker, setFocusedMarker] = useState<CampusMarker | null>(null)

  // Marking & Editing Mode
  const [isMarkingMode, setIsMarkingMode] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingMarker, setEditingMarker] = useState<Partial<CampusMarker> | null>(null)

  // Persist custom markers
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(markers))
    } catch {
      // ignore
    }
  }, [markers])

  const handleSelectMarker = (marker: CampusMarker) => {
    setFocusedMarker(marker)
    setActiveMarker(marker)
  }

  const handlePanoramaClickToMark = (coords: { pitch: number; yaw: number }) => {
    setEditingMarker({
      pitch: parseFloat(coords.pitch.toFixed(2)),
      yaw: parseFloat(coords.yaw.toFixed(2)),
      category: 'building_with_stages',
    })
    setIsEditorOpen(true)
  }

  const handleSaveMarker = (saved: CampusMarker) => {
    setMarkers((prev) => {
      const exists = prev.some((m) => m.id === saved.id)
      if (exists) {
        return prev.map((m) => (m.id === saved.id ? saved : m))
      }
      return [...prev, saved]
    })
    setFocusedMarker(saved)
    setActiveMarker(saved)
  }

  const handleDeleteMarker = (markerId: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== markerId))
    if (activeMarker?.id === markerId) {
      setActiveMarker(null)
    }
  }

  const handleExportMarkers = () => {
    const jsonStr = JSON.stringify(markers, null, 2)
    navigator.clipboard?.writeText(jsonStr)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'holy-grace-campus-markers.json'
    a.click()
    URL.revokeObjectURL(url)
    alert('Campus markers exported to JSON and copied to your clipboard!')
  }

  return (
    <main className="panorama-page">
      <PanoramaViewer
        className="panorama-viewer"
        preview={PANORAMA_PREVIEW}
        standard={PANORAMA_STANDARD}
        fallback={PANORAMA_FALLBACK}
        markers={markers}
        selectedCategory={selectedCategory}
        focusedMarker={focusedMarker}
        isMarkingMode={isMarkingMode}
        onMarkerClick={handleSelectMarker}
        onPanoramaClickToMark={handlePanoramaClickToMark}
        onReady={() => setImageReady(true)}
      />

      {/* Top Filter and Search Bar */}
      <MarkerFilterBar
        markers={markers}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onSelectMarker={handleSelectMarker}
        isMarkingMode={isMarkingMode}
        onToggleMarkingMode={() => setIsMarkingMode((prev) => !prev)}
        onExportMarkers={handleExportMarkers}
      />

      {/* Marking Mode Banner when active */}
      {isMarkingMode && (
        <div className="marking-mode-banner">
          <span>🎯 <strong>Marking Mode Active:</strong> Click anywhere on the campus to place a building or area marker.</span>
          <button onClick={() => setIsMarkingMode(false)}>Done</button>
        </div>
      )}

      {/* Detail Modal for Clicked Building / Area */}
      <MarkerDetailModal
        marker={activeMarker}
        onClose={() => setActiveMarker(null)}
        onFocus={(m) => setFocusedMarker(m)}
        onEdit={(m) => {
          setActiveMarker(null)
          setEditingMarker(m)
          setIsEditorOpen(true)
        }}
      />

      {/* Add / Edit Marker Modal */}
      <MarkerEditorModal
        marker={editingMarker}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false)
          setEditingMarker(null)
        }}
        onSave={handleSaveMarker}
        onDelete={handleDeleteMarker}
      />

      <p className="panorama-hint">
        Drag to rotate · Pinch or scroll to zoom · Click pins for details
      </p>

      <WelcomeScreen imageReady={imageReady} />
    </main>
  )
}

export default App
