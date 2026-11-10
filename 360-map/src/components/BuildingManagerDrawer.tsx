import React, { useState } from 'react'
import {
  type CampusBuilding,
  type CampusStage,
  type BuildingCategory,
  CATEGORY_CONFIG,
  getCategoryDetails,
} from '../types/marker'

export interface BuildingManagerDrawerProps {
  isOpen: boolean
  onClose: () => void
  buildings: CampusBuilding[]
  pendingAddBuildingName: string | null
  targetMoveBuildingId: string | null
  selectedBuildingId: string | null
  onStartAddBuilding: (name: string) => void
  onCancelAddBuilding: () => void
  onStartMoveBuilding: (id: string) => void
  onCancelMoveBuilding: () => void
  onUpdateBuildingName: (id: string, name: string) => void
  onUpdateBuildingCategory: (id: string, category: BuildingCategory) => void
  onUpdateBuildingCoords: (id: string, coords: { pitch: number; yaw: number }) => void
  onDeleteBuilding: (id: string) => void
  onAddStage: (buildingId: string, stage: CampusStage) => void
  onUpdateStage: (buildingId: string, stageIndex: number, stage: CampusStage) => void
  onDeleteStage: (buildingId: string, stageIndex: number) => void
  onFocusBuilding: (building: CampusBuilding) => void
  onExportJSON: () => void
  onImportJSON: () => void
  onClearAll: () => void
}

export const BuildingManagerDrawer: React.FC<BuildingManagerDrawerProps> = ({
  isOpen,
  onClose,
  buildings,
  pendingAddBuildingName,
  targetMoveBuildingId,
  selectedBuildingId,
  onStartAddBuilding,
  onCancelAddBuilding,
  onStartMoveBuilding,
  onCancelMoveBuilding,
  onUpdateBuildingName,
  onUpdateBuildingCategory,
  onUpdateBuildingCoords,
  onDeleteBuilding,
  onAddStage,
  onUpdateStage,
  onDeleteStage,
  onFocusBuilding,
  onExportJSON,
  onImportJSON,
  onClearAll,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newBuildingNameInput, setNewBuildingNameInput] = useState('')
  const [expandedBuildingIds, setExpandedBuildingIds] = useState<Set<string>>(new Set())
  const [addingStageForBuildingId, setAddingStageForBuildingId] = useState<string | null>(null)
  const [newStageNum, setNewStageNum] = useState('')
  const [newStageName, setNewStageName] = useState('')
  const [newStageFloor, setNewStageFloor] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all')

  const toggleExpand = (buildingId: string) => {
    setExpandedBuildingIds((prev) => {
      const next = new Set(prev)
      if (next.has(buildingId)) {
        next.delete(buildingId)
      } else {
        next.add(buildingId)
      }
      return next
    })
  }

  // Calculate next stage number across the campus
  const getNextStageNumber = () => {
    let maxNum = 0
    buildings.forEach((b) => {
      b.stages?.forEach((s) => {
        if (s.stageNumber > maxNum) maxNum = s.stageNumber
      })
    })
    return maxNum + 1
  }

  const handleOpenAddStage = (buildingId: string) => {
    setExpandedBuildingIds((prev) => new Set(prev).add(buildingId))
    setAddingStageForBuildingId(buildingId)
    setNewStageNum(String(getNextStageNumber()))
    setNewStageName('')
    setNewStageFloor('')
  }

  const handleSaveStage = (buildingId: string) => {
    const num = parseInt(newStageNum.trim(), 10)
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid stage number (e.g. 1, 2, 3)')
      return
    }

    const name = newStageName.trim() || `Stage ${num}`
    const floor = newStageFloor.trim() || undefined

    onAddStage(buildingId, { stageNumber: num, name, floor })
    setAddingStageForBuildingId(null)
    setNewStageNum('')
    setNewStageName('')
    setNewStageFloor('')
  }

  const filteredBuildings = buildings.filter((b) => {
    if (selectedCatFilter !== 'all' && b.category !== selectedCatFilter) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const nameMatch = b.name.toLowerCase().includes(q)
    const stageMatch = b.stages?.some(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.stageNumber) === q ||
        `stage ${s.stageNumber}`.includes(q) ||
        s.floor?.toLowerCase().includes(q)
    )
    return nameMatch || stageMatch
  })

  if (!isOpen) return null

  return (
    <aside className="bld-drawer-overlay animate-fade-in" onClick={onClose}>
      <div className="bld-drawer-container" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="bld-drawer-header">
          <div className="bld-drawer-title-group">
            <span className="bld-drawer-icon">🏢</span>
            <div>
              <h2 className="bld-drawer-title">Campus Buildings & Stages</h2>
              <span className="bld-drawer-subtitle">
                {buildings.length} {buildings.length === 1 ? 'Location' : 'Locations'} marked
              </span>
            </div>
          </div>

          <div className="bld-drawer-header-actions">
            <button
              type="button"
              className="btn-drawer-tool"
              onClick={onExportJSON}
              title="Export all buildings and stages as JSON"
            >
              📋 Export
            </button>
            <button
              type="button"
              className="btn-drawer-tool"
              onClick={onImportJSON}
              title="Import buildings JSON"
            >
              📥 Import
            </button>
            {buildings.length > 0 && (
              <button
                type="button"
                className="btn-drawer-tool btn-drawer-tool--danger"
                onClick={onClearAll}
                title="Wipe and restart"
              >
                🗑️ Clear
              </button>
            )}
            <button
              type="button"
              className="btn-drawer-close"
              onClick={onClose}
              aria-label="Close Drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action: New Building Form (HOLLY-GRACE-MAP Pattern) */}
        <div className="bld-action-card">
          <div className="bld-action-card-header">
            <span className="bld-action-label">Marking & Creation</span>
            {!isAddOpen && (
              <button
                type="button"
                className="btn-new-building"
                onClick={() => setIsAddOpen(true)}
              >
                ➕ New Building
              </button>
            )}
          </div>

          {isAddOpen && (
            <div className="bld-add-form animate-slide-up">
              <div className="bld-add-input-row">
                <input
                  type="text"
                  autoFocus
                  value={newBuildingNameInput}
                  onChange={(e) => setNewBuildingNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!newBuildingNameInput.trim()) {
                        alert('Please enter a building name')
                        return
                      }
                      onStartAddBuilding(newBuildingNameInput.trim())
                      setNewBuildingNameInput('')
                      setIsAddOpen(false)
                    }
                  }}
                  placeholder="Building Name (e.g. Ephatha Block, Main Stage, Canteen)"
                  className="bld-input-text"
                />
                <button
                  type="button"
                  className="btn-place-map"
                  onClick={() => {
                    if (!newBuildingNameInput.trim()) {
                      alert('Please enter a building name')
                      return
                    }
                    onStartAddBuilding(newBuildingNameInput.trim())
                    setNewBuildingNameInput('')
                    setIsAddOpen(false)
                  }}
                >
                  📍 Place on Map
                </button>
                <button
                  type="button"
                  className="btn-cancel-add"
                  onClick={() => {
                    setIsAddOpen(false)
                    setNewBuildingNameInput('')
                  }}
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
              <p className="bld-tip-text">
                💡 Click <strong>"Place on Map"</strong>, then click anywhere on the 360° campus panorama to drop this building marker.
              </p>
            </div>
          )}

          {/* Pending Add Notification */}
          {pendingAddBuildingName && (
            <div className="bld-pending-banner animate-pulse">
              <span>
                🎯 Click on 360 panorama to place <strong>"{pendingAddBuildingName}"</strong>
              </span>
              <button type="button" onClick={onCancelAddBuilding} className="btn-cancel-pending">
                Cancel
              </button>
            </div>
          )}

          {/* Pending Relocate Notification */}
          {targetMoveBuildingId && (
            <div className="bld-pending-banner bld-pending-banner--relocate animate-pulse">
              <span>
                📍 Click on 360 panorama to relocate{' '}
                <strong>
                  "{buildings.find((b) => b.id === targetMoveBuildingId)?.name || 'Building'}"
                </strong>
              </span>
              <button type="button" onClick={onCancelMoveBuilding} className="btn-cancel-pending">
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="bld-search-filter-box">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search building name, stage number, floor..."
            className="bld-search-input"
          />
          {searchQuery && (
            <button className="bld-clear-search" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="bld-cat-chips-scroll">
          <button
            className={`bld-cat-chip ${selectedCatFilter === 'all' ? 'bld-cat-chip--active' : ''}`}
            onClick={() => setSelectedCatFilter('all')}
          >
            All ({buildings.length})
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
            const count = buildings.filter((b) => b.category === key).length
            if (count === 0 && selectedCatFilter !== key) return null
            return (
              <button
                key={key}
                className={`bld-cat-chip ${selectedCatFilter === key ? 'bld-cat-chip--active' : ''}`}
                onClick={() => setSelectedCatFilter(key)}
              >
                {cfg.icon} {cfg.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Buildings List */}
        <div className="bld-list-scroll">
          {filteredBuildings.length === 0 ? (
            <div className="bld-empty-card">
              {buildings.length === 0 ? (
                <>
                  <div className="bld-empty-icon">📍</div>
                  <h3>No Buildings Added Yet</h3>
                  <p>
                    Click <strong>"➕ New Building"</strong> above, type the name, and click on the 360° panorama to place your first location!
                  </p>
                </>
              ) : (
                <p>No locations match "{searchQuery}"</p>
              )}
            </div>
          ) : (
            filteredBuildings.map((bld) => {
              const isTargeted = targetMoveBuildingId === bld.id
              const isSelected = selectedBuildingId === bld.id
              const isExpanded = expandedBuildingIds.has(bld.id)
              const catDetails = getCategoryDetails(bld.category)
              const stages = bld.stages || []

              return (
                <div
                  key={bld.id}
                  className={`bld-card ${isTargeted ? 'bld-card--targeted' : ''} ${
                    isSelected ? 'bld-card--selected' : ''
                  }`}
                >
                  {/* Building Header: Icon, Name Input, Category, Coords, Delete */}
                  <div className="bld-card-header">
                    <div className="bld-card-header-left">
                      <span className="bld-card-cat-icon">{catDetails.icon}</span>
                      <input
                        type="text"
                        value={bld.name}
                        onChange={(e) => onUpdateBuildingName(bld.id, e.target.value)}
                        className="bld-card-name-input"
                        placeholder="Building Name"
                        title="Click to rename building"
                      />
                    </div>

                    <div className="bld-card-header-right">
                      <select
                        value={bld.category}
                        onChange={(e) =>
                          onUpdateBuildingCategory(bld.id, e.target.value as BuildingCategory)
                        }
                        className="bld-card-cat-select"
                        title="Select Building Category"
                      >
                        {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => (
                          <option key={k} value={k}>
                            {cfg.icon} {cfg.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete "${bld.name}" and ${
                                stages.length > 0 ? `all its ${stages.length} stages` : 'its pin'
                              }?`
                            )
                          ) {
                            onDeleteBuilding(bld.id)
                          }
                        }}
                        className="btn-card-delete"
                        title="Delete building"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Relocation & Coordinate Nudge Controls */}
                  <div className="bld-coord-row">
                    <div className="bld-coord-actions">
                      <button
                        type="button"
                        onClick={() => onStartMoveBuilding(bld.id)}
                        className={`btn-card-pick ${isTargeted ? 'btn-card-pick--active' : ''}`}
                      >
                        📍 {isTargeted ? 'Click 360 View...' : 'Pick on Map'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onFocusBuilding(bld)}
                        className="btn-card-focus"
                        title="Center camera on this building"
                      >
                        🎯 Focus
                      </button>
                    </div>

                    {/* Nudge Controls */}
                    <div className="bld-nudge-box">
                      <div className="bld-nudge-axis">
                        <span className="bld-nudge-label">Pitch:</span>
                        <button
                          type="button"
                          className="btn-nudge"
                          onClick={() =>
                            onUpdateBuildingCoords(bld.id, {
                              pitch: parseFloat((bld.pitch - 1).toFixed(2)),
                              yaw: bld.yaw,
                            })
                          }
                        >
                          -1°
                        </button>
                        <span className="bld-nudge-val">{bld.pitch}°</span>
                        <button
                          type="button"
                          className="btn-nudge"
                          onClick={() =>
                            onUpdateBuildingCoords(bld.id, {
                              pitch: parseFloat((bld.pitch + 1).toFixed(2)),
                              yaw: bld.yaw,
                            })
                          }
                        >
                          +1°
                        </button>
                      </div>

                      <div className="bld-nudge-axis">
                        <span className="bld-nudge-label">Yaw:</span>
                        <button
                          type="button"
                          className="btn-nudge"
                          onClick={() =>
                            onUpdateBuildingCoords(bld.id, {
                              pitch: bld.pitch,
                              yaw: parseFloat((bld.yaw - 1).toFixed(2)),
                            })
                          }
                        >
                          -1°
                        </button>
                        <span className="bld-nudge-val">{bld.yaw}°</span>
                        <button
                          type="button"
                          className="btn-nudge"
                          onClick={() =>
                            onUpdateBuildingCoords(bld.id, {
                              pitch: bld.pitch,
                              yaw: parseFloat((bld.yaw + 1).toFixed(2)),
                            })
                          }
                        >
                          +1°
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STAGES & FLOORS SECTION (HOLLY-GRACE-MAP Pattern) */}
                  <div className="bld-stages-section">
                    <div className="bld-stages-header">
                      <button
                        type="button"
                        onClick={() => toggleExpand(bld.id)}
                        className="btn-toggle-stages"
                      >
                        <span className="bld-chevron">{isExpanded ? '▼' : '▶'}</span>
                        <span className="bld-stages-title">Stages</span>
                        <span
                          className={`bld-stages-count-badge ${
                            stages.length > 0 ? 'bld-stages-count-badge--has' : ''
                          }`}
                        >
                          {stages.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAddStage(bld.id)}
                        className="btn-add-stage"
                      >
                        ➕ Add Stage
                      </button>
                    </div>

                    {/* Inline Form to Add Stage */}
                    {addingStageForBuildingId === bld.id && (
                      <div className="bld-inline-stage-form animate-fade-in">
                        <div className="bld-stage-form-title">
                          ➕ Add Stage to "{bld.name}"
                        </div>
                        <div className="bld-stage-form-row">
                          <input
                            type="number"
                            min="1"
                            value={newStageNum}
                            onChange={(e) => setNewStageNum(e.target.value)}
                            placeholder="Stage #"
                            className="bld-stage-num-input"
                            title="Stage Number"
                          />
                          <input
                            type="text"
                            value={newStageName}
                            onChange={(e) => setNewStageName(e.target.value)}
                            placeholder="Stage Name (e.g. Auditorium Hall, Classical Stage)"
                            className="bld-stage-name-input"
                          />
                        </div>

                        <div className="bld-stage-form-floor-row">
                          <span className="bld-floor-tag">Floor / Room:</span>
                          <input
                            type="text"
                            value={newStageFloor}
                            onChange={(e) => setNewStageFloor(e.target.value)}
                            placeholder="e.g. 3rd Floor (Auditorium), 2nd Floor (Classroom XI-E)"
                            className="bld-stage-floor-input"
                          />
                        </div>

                        <div className="bld-stage-form-actions">
                          <button
                            type="button"
                            onClick={() => setAddingStageForBuildingId(null)}
                            className="btn-stage-cancel"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveStage(bld.id)}
                            className="btn-stage-save"
                          >
                            Save Stage
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stages List */}
                    {isExpanded && (
                      <div className="bld-stages-list animate-fade-in">
                        {stages.length === 0 ? (
                          <div className="bld-no-stages-notice">
                            No stages in this building (standalone building/landmark)
                          </div>
                        ) : (
                          stages.map((stg, stgIdx) => (
                            <div key={stgIdx} className="bld-stage-item">
                              <div className="bld-stage-item-top">
                                <span className="bld-stage-badge">
                                  #{stg.stageNumber}
                                </span>
                                <input
                                  type="text"
                                  value={stg.name}
                                  onChange={(e) =>
                                    onUpdateStage(bld.id, stgIdx, {
                                      ...stg,
                                      name: e.target.value,
                                    })
                                  }
                                  className="bld-stage-item-name-input"
                                  placeholder="Stage Name"
                                />
                                <button
                                  type="button"
                                  onClick={() => onDeleteStage(bld.id, stgIdx)}
                                  className="btn-stage-item-delete"
                                  title="Remove this stage"
                                >
                                  ✕
                                </button>
                              </div>

                              <div className="bld-stage-item-floor">
                                <span className="bld-floor-label">Floor:</span>
                                <input
                                  type="text"
                                  value={stg.floor || ''}
                                  onChange={(e) =>
                                    onUpdateStage(bld.id, stgIdx, {
                                      ...stg,
                                      floor: e.target.value,
                                    })
                                  }
                                  className="bld-stage-item-floor-input"
                                  placeholder="Floor / Room info (optional)"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}
