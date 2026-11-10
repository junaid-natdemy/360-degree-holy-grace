import { useState, useEffect, useRef } from 'react'
import PanoramaViewer, { type PanoramaViewerHandle } from './components/PanoramaViewer'
import { WelcomeScreen } from './components/WelcomeScreen'
import { MarkerFilterBar } from './components/MarkerFilterBar'
import { MarkerDetailModal } from './components/MarkerDetailModal'
import { BuildingManagerDrawer } from './components/BuildingManagerDrawer'
import { INITIAL_CAMPUS_MARKERS } from './config/initialMarkers'
import type {
  CampusBuilding,
  CampusStage,
  BuildingCategory,
} from './types/marker'
import './App.css'

const PANORAMA_PREVIEW = '/panoramas/panorama-preview.webp'
const PANORAMA_STANDARD = '/panoramas/panorama.webp'
const PANORAMA_FALLBACK = '/panoramas/pano-4096.jpg'
const STORAGE_KEY = 'holy_grace_360_buildings_v2'

function App() {
  const [imageReady, setImageReady] = useState(false)
  const viewerHandleRef = useRef<PanoramaViewerHandle>(null)

  // Buildings & Stages state
  const [buildings, setBuildings] = useState<CampusBuilding[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_CAMPUS_MARKERS
  })

  // Category filter for the panorama pins & search
  const [selectedCategory, setSelectedCategory] = useState<BuildingCategory | 'all'>('all')
  const [activeMarker, setActiveMarker] = useState<CampusBuilding | null>(null)
  const [focusedMarker, setFocusedMarker] = useState<CampusBuilding | null>(null)

  // Developer Building Manager Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)

  // Workflow states: Pending Placement & Relocation (HOLLY-GRACE-MAP Pattern)
  const [pendingAddBuildingName, setPendingAddBuildingName] = useState<string | null>(null)
  const [targetMoveBuildingId, setTargetMoveBuildingId] = useState<string | null>(null)

  // Persist buildings & stages
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildings))
    } catch {
      // ignore
    }
  }, [buildings])

  const handleSelectMarker = (marker: CampusBuilding) => {
    setFocusedMarker(marker)
    setActiveMarker(marker)
  }

  // Handle clicks on 360 viewer when in "Place on Map" or "Relocate" mode
  const handlePanoramaClick = (coords: { pitch: number; yaw: number }) => {
    const pitch = parseFloat(coords.pitch.toFixed(2))
    const yaw = parseFloat(coords.yaw.toFixed(2))

    // 1. Placing a newly added building
    if (pendingAddBuildingName !== null) {
      const newBuilding: CampusBuilding = {
        id: `bld-${Date.now()}`,
        name: pendingAddBuildingName.trim(),
        category: 'academic',
        pitch,
        yaw,
        stages: [],
      }
      setBuildings((prev) => [...prev, newBuilding])
      setPendingAddBuildingName(null)
      setSelectedBuildingId(newBuilding.id)
      setIsDrawerOpen(true) // reopen drawer so user can immediately add stages
      return
    }

    // 2. Relocating an existing building
    if (targetMoveBuildingId !== null) {
      setBuildings((prev) =>
        prev.map((b) => (b.id === targetMoveBuildingId ? { ...b, pitch, yaw } : b))
      )
      setTargetMoveBuildingId(null)
      setIsDrawerOpen(true)
    }
  }

  // Building Actions
  const handleStartAddBuilding = (name: string) => {
    setPendingAddBuildingName(name)
    setTargetMoveBuildingId(null)
    setIsDrawerOpen(false) // reveal the 360 panorama for placement
  }

  const handleCancelAddBuilding = () => {
    setPendingAddBuildingName(null)
    setIsDrawerOpen(true)
  }

  const handleStartMoveBuilding = (id: string) => {
    setTargetMoveBuildingId(id)
    setPendingAddBuildingName(null)
    setIsDrawerOpen(false) // reveal the 360 panorama for relocation
  }

  const handleCancelMoveBuilding = () => {
    setTargetMoveBuildingId(null)
    setIsDrawerOpen(true)
  }

  const handleUpdateBuildingName = (id: string, name: string) => {
    setBuildings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name } : b))
    )
  }

  const handleUpdateBuildingCategory = (id: string, category: BuildingCategory) => {
    setBuildings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, category } : b))
    )
  }

  const handleUpdateBuildingCoords = (id: string, coords: { pitch: number; yaw: number }) => {
    setBuildings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...coords } : b))
    )
  }

  const handleDeleteBuilding = (id: string) => {
    setBuildings((prev) => prev.filter((b) => b.id !== id))
    if (activeMarker?.id === id) setActiveMarker(null)
    if (selectedBuildingId === id) setSelectedBuildingId(null)
  }

  // Stages & Floors Actions
  const handleAddStage = (buildingId: string, stage: CampusStage) => {
    setBuildings((prev) =>
      prev.map((b) => {
        if (b.id !== buildingId) return b
        const existing = b.stages || []
        const updated = [...existing, stage].sort((a, b) => {
          const numA = typeof a.stageNumber === 'number' ? a.stageNumber : parseInt(String(a.stageNumber || ''), 10)
          const numB = typeof b.stageNumber === 'number' ? b.stageNumber : parseInt(String(b.stageNumber || ''), 10)
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB
          if (!isNaN(numA)) return -1
          if (!isNaN(numB)) return 1
          return a.name.localeCompare(b.name)
        })
        return { ...b, stages: updated }
      })
    )
  }

  const handleUpdateStage = (buildingId: string, stageIndex: number, stage: CampusStage) => {
    setBuildings((prev) =>
      prev.map((b) => {
        if (b.id !== buildingId) return b
        const updated = [...(b.stages || [])]
        updated[stageIndex] = stage
        return { ...b, stages: updated }
      })
    )
  }

  const handleDeleteStage = (buildingId: string, stageIndex: number) => {
    setBuildings((prev) =>
      prev.map((b) => {
        if (b.id !== buildingId) return b
        const updated = (b.stages || []).filter((_, i) => i !== stageIndex)
        return { ...b, stages: updated }
      })
    )
  }

  const handleFocusBuilding = (bld: CampusBuilding) => {
    setFocusedMarker(bld)
    viewerHandleRef.current?.lookAt(bld.pitch, bld.yaw, 70, 1000)
  }

  // Export / Import
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(buildings, null, 2)
    navigator.clipboard?.writeText(jsonStr)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'holy-grace-campus-buildings.json'
    a.click()
    URL.revokeObjectURL(url)
    alert(`Exported ${buildings.length} buildings & stages to JSON and copied to clipboard!`)
  }

  const handleImportJSON = () => {
    const jsonStr = prompt('Paste your exported buildings JSON here:')
    if (!jsonStr) return
    try {
      const parsed = JSON.parse(jsonStr)
      if (Array.isArray(parsed)) {
        setBuildings(parsed)
        alert(`Successfully imported ${parsed.length} buildings!`)
      } else {
        alert('Invalid JSON: expected an array of buildings.')
      }
    } catch {
      alert('Failed to parse JSON. Please check the format.')
    }
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all buildings & stages and start fresh?')) {
      setBuildings([])
      setActiveMarker(null)
      setSelectedBuildingId(null)
      setPendingAddBuildingName(null)
      setTargetMoveBuildingId(null)
    }
  }

  const isMarkingActive = pendingAddBuildingName !== null || targetMoveBuildingId !== null

  return (
    <main className="panorama-page">
      <PanoramaViewer
        ref={viewerHandleRef}
        className="panorama-viewer"
        preview={PANORAMA_PREVIEW}
        standard={PANORAMA_STANDARD}
        fallback={PANORAMA_FALLBACK}
        markers={buildings}
        selectedCategory={selectedCategory}
        focusedMarker={focusedMarker}
        isMarkingMode={isMarkingActive}
        onMarkerClick={handleSelectMarker}
        onPanoramaClickToMark={handlePanoramaClick}
        onReady={() => setImageReady(true)}
      />

      {/* Top Filter and Search Bar */}
      <MarkerFilterBar
        markers={buildings}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onSelectMarker={handleSelectMarker}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        onOpenNewBuilding={() => {
          setIsDrawerOpen(true)
        }}
        onExportMarkers={handleExportJSON}
        onImportMarkers={handleImportJSON}
      />

      {/* Floating Pending Placement Banner (HOLLY-GRACE-MAP Pattern) */}
      {pendingAddBuildingName && (
        <div className="bld-floating-placement-banner animate-pulse">
          <div className="bld-placement-text">
            🎯 Click anywhere on the 360° campus to place: <strong>"{pendingAddBuildingName}"</strong>
          </div>
          <button type="button" onClick={handleCancelAddBuilding} className="btn-placement-cancel">
            Cancel
          </button>
        </div>
      )}

      {/* Floating Pending Relocation Banner */}
      {targetMoveBuildingId && (
        <div className="bld-floating-placement-banner bld-floating-placement-banner--relocate animate-pulse">
          <div className="bld-placement-text">
            📍 Click on the 360° campus to relocate:{' '}
            <strong>
              "{buildings.find((b) => b.id === targetMoveBuildingId)?.name || 'Building'}"
            </strong>
          </div>
          <button type="button" onClick={handleCancelMoveBuilding} className="btn-placement-cancel">
            Cancel
          </button>
        </div>
      )}

      {/* Detail Modal when user clicks any hotspot pin */}
      <MarkerDetailModal
        marker={activeMarker}
        onClose={() => setActiveMarker(null)}
        onFocus={(m) => handleFocusBuilding(m)}
        onEdit={(m) => {
          setActiveMarker(null)
          setSelectedBuildingId(m.id)
          setIsDrawerOpen(true)
        }}
      />

      {/* Developer Building & Stage Manager Drawer */}
      <BuildingManagerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        buildings={buildings}
        pendingAddBuildingName={pendingAddBuildingName}
        targetMoveBuildingId={targetMoveBuildingId}
        selectedBuildingId={selectedBuildingId}
        onStartAddBuilding={handleStartAddBuilding}
        onCancelAddBuilding={handleCancelAddBuilding}
        onStartMoveBuilding={handleStartMoveBuilding}
        onCancelMoveBuilding={handleCancelMoveBuilding}
        onUpdateBuildingName={handleUpdateBuildingName}
        onUpdateBuildingCategory={handleUpdateBuildingCategory}
        onUpdateBuildingCoords={handleUpdateBuildingCoords}
        onDeleteBuilding={handleDeleteBuilding}
        onAddStage={handleAddStage}
        onUpdateStage={handleUpdateStage}
        onDeleteStage={handleDeleteStage}
        onFocusBuilding={handleFocusBuilding}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onClearAll={handleClearAll}
      />

      <p className="panorama-hint">
        Drag to rotate · Pinch or scroll to zoom · Click pins for details
      </p>

      <WelcomeScreen imageReady={imageReady} />
    </main>
  )
}

export default App
